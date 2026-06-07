import time
from datetime import datetime, timedelta
import pandas as pd
from pykrx import stock
from .config import START_DATE, END_DATE, MARKET, SLEEP_TIME
import logging

log = logging.getLogger(__name__)

class collect:
    def __init__(self, db):
        self.db = db
        start, end = self.check_date('daily_price')
        self.tickers = stock.get_market_ticker_list(end, MARKET)
        self.total = len(self.tickers)

    def check_date(self, table_name):
        last_date = self.db.last_modified_date(table_name)
        if last_date == None:
            start = START_DATE
        else:
            start = (last_date + timedelta(days=1)).strftime("%Y%m%d")
        if END_DATE == None:
            end = stock.get_nearest_business_day_in_a_week()
        else:
            end = END_DATE
        return start, end
    
    def update_name(self, engine):
        with engine.connect() as con:
            db_tickers = pd.read_sql("SELECT ticker FROM company_info", con)
        new_tickers = set(self.tickers) - set(db_tickers['ticker'])
        stock_list = []
        i = 0
        for ticker in new_tickers:
            i += 1
            stock_list.append({
                'ticker' : ticker,
                'name' : stock.get_market_ticker_name(ticker),
                'market' : MARKET
                })
            time.sleep(SLEEP_TIME)
            log.info(f"name update {i}/{self.total} {ticker}")
        if stock_list:
            pd.DataFrame(stock_list).to_sql('company_info', engine, if_exists='append', index=False)
            log.info("finished updating names")
            
    def update_price(self, engine):
        start, end = self.check_date('daily_price')
        if start > end:
            log.info("price already updated")
            return
        i = 0
        for ticker in self.tickers:
            i += 1
            market_cap = stock.get_market_cap(start, end, ticker)
            if market_cap.empty:
                log.warning(f"price market_cap {ticker} no data")
                time.sleep(SLEEP_TIME)
                continue
            ohlcv = stock.get_market_ohlcv(start, end, ticker)
            if ohlcv.empty:
                log.warning(f"price ohlcv {ticker} no data")
                time.sleep(SLEEP_TIME)
                continue
            dataframe_price = ohlcv.join(market_cap[['거래대금', '시가총액', '상장주식수']])
            dataframe_price.index.name = 'date'
            dataframe_price = dataframe_price.reset_index()
            dataframe_price['ticker'] = ticker
            dataframe_price = dataframe_price.rename(columns={
                '시가' : 'stock_open',
                '고가' : 'stock_high',
                '저가' : 'stock_low',
                '종가' : 'stock_close',
                '거래량' : 'stock_volume',
                '거래대금' : 'trading_value',
                '등락률' : 'stock_change',
                '시가총액' : 'market_cap',
                '상장주식수' : 'listed_shares'
            })
            dataframe_price.to_sql('daily_price', engine, if_exists='append', index=False)
            log.info(f"price update {i}/{self.total} {ticker}")
            time.sleep(SLEEP_TIME)
        log.info("finished updating prices")
    
    def update_fundamental(self, engine):
        start, end = self.check_date('daily_fundamental')
        if start > end:
            log.info("fundamental already updated")
            return
        i = 0
        for ticker in self.tickers:
            i += 1
            dataframe_fundamental = stock.get_market_fundamental(start, end, ticker)
            if dataframe_fundamental.empty:
                log.warning(f"fundamental {ticker} no data")
                time.sleep(SLEEP_TIME)
                continue
            dataframe_fundamental.index.name = 'date'
            dataframe_fundamental = dataframe_fundamental.reset_index()
            dataframe_fundamental['ticker'] = ticker
            dataframe_fundamental = dataframe_fundamental.rename(columns={
                'BPS' : 'bps', 'PER' : 'per', 'PBR' : 'pbr',
                'EPS' : 'eps', 'DIV' : 'div_yield', 'DPS' : 'dps'
            })
            dataframe_fundamental.to_sql('daily_fundamental', engine, if_exists='append', index=False)
            log.info(f"fundamental update {i}/{self.total} {ticker}")
            time.sleep(SLEEP_TIME)
        log.info("finished updating fundamentals")

    # 거래량
    def update_investor(self, engine):
        start, end = self.check_date('daily_investor')
        if start > end:
            log.info("investor already updated")
            return
        i = 0
        for ticker in self.tickers:
            i += 1
            volume = stock.get_market_trading_volume_by_date(start, end, ticker)
            value = stock.get_market_trading_value_by_date(start, end, ticker)

            if volume.empty:
                log.warning(f"volume {ticker} no data")
                time.sleep(SLEEP_TIME)
                continue
            if value.empty:
                log.warning(f"value {ticker} no data")
                time.sleep(SLEEP_TIME)
                continue

            volume_dataframe = pd.DataFrame({
                    'foreign_net_value': value['외국인합계'],
                    'institution_net_value': value['기관합계'],
                    'individual_net_value': value['개인'],
                    'foreign_net_volume': volume['외국인합계'],
                    'institution_net_volume': volume['기관합계'],
                    'individual_net_volume': volume['개인'],
                    }, index=value.index
                )
            volume_dataframe.index.name = 'date'
            volume_dataframe = volume_dataframe.reset_index()
            volume_dataframe['ticker'] = ticker
            volume_dataframe.to_sql('daily_investor', engine, if_exists='append', index=False)
            log.info(f"investor update {i}/{self.total} {ticker}")
            time.sleep(SLEEP_TIME)
        log.info("finished updating investors")
    
    def update_shorting(self, engine):
        start, end = self.check_date('daily_shorting')
        if start > end:
            log.info("shorting already updated")
            return
        
        start_date = datetime.strptime(start, "%Y%m%d")
        end_date = datetime.strptime(end, "%Y%m%d")

        days = 300
        day_diff = (end_date - start_date).days

        i = 0
        for ticker in self.tickers:
            i += 1
            try:
                total_balance, total_volume = [], []
                for j in range(day_diff // days + 1):
                    collect_start_date = start_date + timedelta(days=days * j)
                    collect_end_date = min(collect_start_date + timedelta(days=days - 1), end_date)
                    collect_start = collect_start_date.strftime("%Y%m%d")
                    collect_end = collect_end_date.strftime("%Y%m%d")

                    try:
                        balance = stock.get_shorting_balance_by_date(collect_start, collect_end_date, ticker)
                        volume = stock.get_shorting_volume_by_date(collect_start, collect_end, ticker)

                        if not balance.empty and not volume.empty:
                            total_balance.append(balance)
                            total_volume.append(volume)

                    except Exception:
                        pass
                    time.sleep(SLEEP_TIME)

                if not total_balance:
                    log.warning(f"shorting_balance {ticker} no data")
                    continue
                if not total_volume:
                    log.warning(f"shorting_volume {ticker} no data")
                    continue

                shorting_balance = pd.concat(total_balance)
                shorting_volume  = pd.concat(total_volume)

                shorting_dataframe = pd.DataFrame({
                    'shorting_volume':        shorting_volume['공매도'],
                    'shorting_volume_ratio':  shorting_volume['비중'],
                    'shorting_balance':       shorting_balance['공매도잔고'],
                    'shorting_balance_ratio': shorting_balance['비중'],
                }, index=shorting_volume.index)
                shorting_dataframe.index.name = 'date'
                shorting_dataframe = shorting_dataframe.reset_index()
                shorting_dataframe['ticker'] = ticker
                shorting_dataframe.to_sql('daily_shorting', engine, if_exists='append', index=False)
                log.info(f"shorting update {i}/{self.total} {ticker}")
            except Exception as e:
                log.warning(f"shorting {ticker} 처리 실패: {e}")
            finally:
                time.sleep(SLEEP_TIME)
        log.info("finished updating shorting")

    def update_market(self, engine):
        start, end = self.check_date('market_index')
        if start > end:
            log.info("market already updated")
            return
        try:
            market_dataframe = stock.get_index_ohlcv(start, end, "1001")

            if market_dataframe.empty:
                log.warning(f"market : no data")
                return

            market_dataframe.index.name = 'date'
            market_dataframe = market_dataframe.reset_index()
            market_dataframe = market_dataframe.rename(columns={
                '시가' : 'market_open',
                '고가' : 'market_high',
                '저가' : 'market_low',
                '종가' : 'market_end',
                '거래량' : 'market_volume'
            })
            market_dataframe = market_dataframe[['date', 'market_open', 'market_high', 'market_low', 'market_end', 'market_volume']]
            market_dataframe.to_sql('market_index', engine, if_exists='append', index=False)
            log.info("finished updating market")
        except Exception as e:
            log.warning(f"market 처리 실패: {e}")
        finally:
            time.sleep(SLEEP_TIME)