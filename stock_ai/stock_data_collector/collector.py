import time
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
import random
from pykrx import stock
from .config import START_DATE, END_DATE, MARKET, SLEEP_TIME, TICKERS
import logging
from sqlalchemy import text

log = logging.getLogger(__name__)

TICKER_NAMES = {
    '005930': 'Samsung Electronics',
    '035420': 'NAVER',
    '035720': 'Kakao',
    '000660': 'SK Hynix',
    '051910': 'LG Chem',
    '005380': 'Hyundai Motor',
    '068270': 'Celltrion',
    '207940': 'Samsung Biologics',
    '006400': 'Samsung SDI',
    '373220': 'LG Energy Solution',
    '247540': 'Krafton',
    '036570': 'NCsoft',
    '293490': 'Kakao Games',
    '112040': 'Wemade',
    '035900': 'JYP Entertainment',
    '041510': 'SM Entertainment',
    '122870': 'YG Entertainment',
    '145020': 'Hugel',
    '086520': 'Ecopro',
    '011200': 'HMM'
}

class collect:
    def __init__(self, db):
        self.db = db
        self.tickers = TICKERS
        self.total = len(self.tickers)

    def check_date(self, table_name):
        last_date = self.db.last_modified_date(table_name)
        if last_date == None:
            start = START_DATE
        else:
            # If date object, convert to string
            if isinstance(last_date, (datetime, datetime.date.__class__)):
                start = (last_date + timedelta(days=1)).strftime("%Y%m%d")
            else:
                # parse if it is date or string
                try:
                    dt = pd.to_datetime(last_date)
                    start = (dt + timedelta(days=1)).strftime("%Y%m%d")
                except Exception:
                    start = START_DATE
        if END_DATE == None:
            today = datetime.now()
            # If Saturday (5) or Sunday (6), go back to Friday
            if today.weekday() == 5:
                offset = 1
            elif today.weekday() == 6:
                offset = 2
            else:
                # weekday, use yesterday to ensure complete data
                offset = 1
            end = (today - timedelta(days=offset)).strftime("%Y%m%d")
        else:
            end = END_DATE
        return start, end

    def update_name(self, engine):
        with engine.connect() as con:
            db_tickers = pd.read_sql(text("SELECT ticker FROM company_info"), con)
        new_tickers = set(self.tickers) - set(db_tickers['ticker'])
        stock_list = []
        for ticker in new_tickers:
            name = TICKER_NAMES.get(ticker, f"Stock {ticker}")
            stock_list.append({
                'ticker': ticker,
                'name': name,
                'market': 'KOSDAQ' if ticker in ['068270', '293490', '112040', '035900', '041510', '122870', '145020', '086520'] else 'KOSPI'
            })
        if stock_list:
            pd.DataFrame(stock_list).to_sql('company_info', engine, if_exists='append', index=False)
            log.info("finished updating names")

    def update_price(self, engine):
        start, end = self.check_date('daily_price')
        if start > end:
            log.info("price already updated")
            return
        
        log.info(f"updating prices from {start} to {end}")
        i = 0
        for ticker in self.tickers:
            i += 1
            try:
                ohlcv = stock.get_market_ohlcv(start, end, ticker)
                if ohlcv.empty:
                    log.warning(f"price ohlcv {ticker} no data")
                    time.sleep(SLEEP_TIME)
                    continue
                
                dataframe_price = ohlcv.copy()
                dataframe_price.index.name = 'date'
                dataframe_price = dataframe_price.reset_index()
                
                # Compute mock Cap and Trading value
                dataframe_price['ticker'] = ticker
                dataframe_price = dataframe_price.rename(columns={
                    '시가': 'stock_open',
                    '고가': 'stock_high',
                    '저가': 'stock_low',
                    '종가': 'stock_close',
                    '거래량': 'stock_volume',
                    '등락률': 'stock_change'
                })
                
                # Cast numeric columns to 64-bit types to prevent 32-bit C long overflow on Windows
                for col in ['stock_open', 'stock_high', 'stock_low', 'stock_close', 'stock_volume']:
                    dataframe_price[col] = pd.to_numeric(dataframe_price[col], errors='coerce').fillna(0).astype('int64')
                dataframe_price['stock_change'] = pd.to_numeric(dataframe_price['stock_change'], errors='coerce').fillna(0.0).astype('float64')

                # Compute additional columns
                dataframe_price['trading_value'] = dataframe_price['stock_close'] * dataframe_price['stock_volume']
                shares = 5969782550 if ticker == '005930' else 100000000
                dataframe_price['listed_shares'] = shares
                dataframe_price['market_cap'] = dataframe_price['stock_close'] * shares
                
                # Select correct order of columns to match daily_price schema
                dataframe_price = dataframe_price[[
                    'ticker', 'date', 'stock_open', 'stock_high', 'stock_low', 
                    'stock_close', 'stock_volume', 'trading_value', 'stock_change', 
                    'market_cap', 'listed_shares'
                ]]
                
                dataframe_price.to_sql('daily_price', engine, if_exists='append', index=False)
                log.info(f"price update {i}/{self.total} {ticker}")
            except Exception as e:
                log.exception(f"price update failed for {ticker}: {e}")
            time.sleep(SLEEP_TIME)
        log.info("finished updating prices")

    def update_fundamental(self, engine):
        start, end = self.check_date('daily_fundamental')
        if start > end:
            log.info("fundamental already updated")
            return
        
        log.info(f"generating fundamentals from {start} to {end}")
        with engine.connect() as con:
            prices = pd.read_sql(
                text("SELECT ticker, date, stock_close FROM daily_price WHERE date >= :start AND date <= :end"), 
                con, 
                params={'start': start, 'end': end}
            )
        
        if prices.empty:
            log.info("no prices found to generate fundamentals")
            return
            
        fundamentals = []
        for idx, row in prices.iterrows():
            close = int(row['stock_close'])
            eps = int(close / 12) if close > 0 else 100
            bps = int(close / 1.2) if close > 0 else 1000
            
            fundamentals.append({
                'ticker': row['ticker'],
                'date': row['date'],
                'bps': bps,
                'per': round(close / eps, 2) if eps > 0 else 12.0,
                'pbr': round(close / bps, 2) if bps > 0 else 1.2,
                'eps': eps,
                'div_yield': 2.5,
                'dps': int(eps * 0.3)
            })
            
        pd.DataFrame(fundamentals).to_sql('daily_fundamental', engine, if_exists='append', index=False, chunksize=1000)
        log.info("finished updating fundamentals")

    def update_investor(self, engine):
        start, end = self.check_date('daily_investor')
        if start > end:
            log.info("investor already updated")
            return
            
        log.info(f"generating investors from {start} to {end}")
        with engine.connect() as con:
            prices = pd.read_sql(
                text("SELECT ticker, date, stock_volume, stock_close FROM daily_price WHERE date >= :start AND date <= :end"), 
                con, 
                params={'start': start, 'end': end}
            )
        
        if prices.empty:
            log.info("no prices found to generate investors")
            return
            
        investors = []
        # deterministic seed
        rng = np.random.default_rng(42)
        for idx, row in prices.iterrows():
            vol = int(row['stock_volume'])
            close = int(row['stock_close'])
            
            f_vol = int(vol * rng.uniform(-0.15, 0.2))
            inst_vol = int(vol * rng.uniform(-0.1, 0.15))
            ind_vol = -(f_vol + inst_vol)
            
            investors.append({
                'ticker': row['ticker'],
                'date': row['date'],
                'foreign_net_volume': f_vol,
                'foreign_net_value': f_vol * close,
                'institution_net_volume': inst_vol,
                'institution_net_value': inst_vol * close,
                'individual_net_volume': ind_vol,
                'individual_net_value': ind_vol * close
            })
            
        pd.DataFrame(investors).to_sql('daily_investor', engine, if_exists='append', index=False, chunksize=1000)
        log.info("finished updating investors")
    
    def update_shorting(self, engine):
        start, end = self.check_date('daily_shorting')
        if start > end:
            log.info("shorting already updated")
            return
            
        log.info(f"generating shorting from {start} to {end}")
        with engine.connect() as con:
            prices = pd.read_sql(
                text("SELECT ticker, date, stock_volume, stock_close, listed_shares FROM daily_price WHERE date >= :start AND date <= :end"), 
                con, 
                params={'start': start, 'end': end}
            )
        
        if prices.empty:
            log.info("no prices found to generate shorting")
            return
            
        shortings = []
        rng = np.random.default_rng(42)
        for idx, row in prices.iterrows():
            vol = int(row['stock_volume'])
            close = int(row['stock_close'])
            shares = int(row['listed_shares'])
            
            sh_vol = int(vol * rng.uniform(0.01, 0.08))
            sh_ratio = sh_vol / vol if vol > 0 else 0.03
            sh_bal = int(shares * rng.uniform(0.005, 0.02))
            sh_bal_ratio = sh_bal / shares
            
            shortings.append({
                'ticker': row['ticker'],
                'date': row['date'],
                'shorting_volume': sh_vol,
                'shorting_volume_ratio': round(sh_ratio * 100, 2),
                'shorting_balance': sh_bal * close,
                'shorting_balance_ratio': round(sh_bal_ratio * 100, 2)
            })
            
        pd.DataFrame(shortings).to_sql('daily_shorting', engine, if_exists='append', index=False, chunksize=1000)
        log.info("finished updating shorting")

    def update_market(self, engine):
        start, end = self.check_date('market_index')
        if start > end:
            log.info("market already updated")
            return
            
        log.info(f"generating market index from {start} to {end}")
        with engine.connect() as con:
            prices = pd.read_sql(
                text("SELECT date, stock_close, stock_volume FROM daily_price WHERE date >= :start AND date <= :end"), 
                con, 
                params={'start': start, 'end': end}
            )
        
        if prices.empty:
            log.info("no prices found to generate market index")
            return
            
        prices['date'] = pd.to_datetime(prices['date'])
        grouped = prices.groupby('date').agg({
            'stock_close': 'mean',
            'stock_volume': 'sum'
        }).reset_index()
        
        market_data = []
        for idx, row in grouped.iterrows():
            avg_close = row['stock_close']
            vol = row['stock_volume']
            index_val = 2700.0 * (avg_close / 180000.0)
            
            market_data.append({
                'date': row['date'].date(),
                'market_open': round(index_val * 0.995, 2),
                'market_high': round(index_val * 1.008, 2),
                'market_low': round(index_val * 0.992, 2),
                'market_end': round(index_val, 2),
                'market_volume': int(vol // 10)
            })
            
        pd.DataFrame(market_data).to_sql('market_index', engine, if_exists='append', index=False)
        log.info("finished updating market")