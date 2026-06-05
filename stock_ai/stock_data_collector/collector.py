import time
from datetime import datetime, timedelta
import pandas as pd
from pykrx import stock
from .config import START_DATE, END_DATE, MARKET, SLEEP_TIME
import logging

log = logging.getLogger(__name__)

class collect:
    def __init__(self, db):
        self.start, self.end = self.check_date(db)
        self.tickers = stock.get_market_ticker_list(self.end, MARKET)

    # 수집 시작, 종료 날짜 설정
    def check_date(self, db):
        last_date = db.last_modified_date("daily_price")
        if last_date == None:
            start = START_DATE
        else:
            start = (last_date + timedelta(days=1)).strftime("%Y%m%d")
        if END_DATE == None:
            end = datetime.now().strftime("%Y%m%d")
        else:
            end = END_DATE
        return start, end
    
    # 주식명 
    def update_name(self, engine):
        with engine.connect() as con:
            db_tickers = pd.read_sql("SELECT ticker FROM company_info", con)
        new_tickers = set(self.tickers) - set(db_tickers['ticker'])
        stock_list = []
        for ticker in new_tickers:
            stock_list.append({
                'ticker' : ticker,
                'name' : stock.get_market_ticker_name(ticker),
                'market' : MARKET
                })
            time.sleep(SLEEP_TIME)
        if stock_list:
            pd.DataFrame(stock_list).to_sql('company_info', engine, if_exists='append', index=False)
            
    # 가격 변동
    def update_price(self, engine):
        for ticker in self.tickers:
            market_cap = stock.get_market_cap(self.start, self.end, ticker)
            ohlcv = stock.get_market_ohlcv(self.start, self.end, ticker)
            dataframe_price = ohlcv.join(market_cap[['시가총액', '상장주식수']])
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
            time.sleep(SLEEP_TIME)
    
    # 보조 지표
    def update_fundamental(self, engine):
        for ticker in self.tickers:
            dataframe_fundamental = stock.get_market_fundamental(self.start, self.end, ticker)
            dataframe_fundamental.index.name = 'date'
            dataframe_fundamental = dataframe_fundamental.reset_index()
            dataframe_fundamental['ticker'] = ticker
            dataframe_fundamental = dataframe_fundamental.rename(columns={
                'BPS' : 'bps', 'PER' : 'per', 'PBR' : 'pbr',
                'EPS' : 'eps', 'DIV' : 'div', 'DPS' : 'dps'
            })
            dataframe_fundamental.to_sql('daily_fundamental', engine, if_exists='append', index=False)
            time.sleep(SLEEP_TIME)

    # 거래량
    def update_investor(self, engine):
        for ticker in self.tickers:
            volume = stock.get_market_trading_volume_by_date(self.start, self.end, ticker)
            value = stock.get_market_trading_value_by_date(self.start, self.end, ticker)
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
            time.sleep(SLEEP_TIME)
    
    # 공매도
    def update_shorting(self, engine):
        for ticker in self.tickers:
            shorting_balance = stock.get_shorting_balance_by_date(self.start, self.end, ticker)
            shorting_volume = stock.get_shorting_volume_by_date(self.start, self.end, ticker)
            shorting_dataframe = pd.DataFrame({
                'shorting_volume':        shorting_volume['공매도'],
                'shorting_volume_ratio':  shorting_volume['비중'],
                'shorting_balance':       shorting_balance['잔고수량'],
                'shorting_balance_ratio': shorting_balance['주식잔고비율'],
            }, index=shorting_volume.index)
            shorting_dataframe.index.name = 'date'
            shorting_dataframe = shorting_dataframe.reset_index()
            shorting_dataframe['ticker'] = ticker
            shorting_dataframe.to_sql('daily_shorting', engine, if_exists='append', index=False)
            time.sleep(SLEEP_TIME)

    def update_market(self, engine):
        market_dataframe = stock.get_index_ohlcv(self.start, self.end, "1001")
        market_dataframe.index.name = 'date'
        market_dataframe = market_dataframe.reset_index()
        market_dataframe = market_dataframe.rename(columns={
            '시가' : 'market_open',
            '고가' : 'market_high',
            '저가' : 'market_low',
            '종가' : 'market_end',
            '거래량' : 'market_volume'
        })
        market_dataframe.to_sql('market_index', engine, if_exists='append', index=False)
        time.sleep(SLEEP_TIME)