from stock_data_collector.config import INCREASE_RATE, STOP_RATE, FORWARD_DAYS, TEST_RATIO
from stock_data_collector.db import DataBase
import pandas as pd
import numpy as np
from sqlalchemy import text

FEATURES = [
    'ma20_ratio', 'ma60_ratio', 'ma120_ratio',
    'rsi', 'macd', 'BB', 'hl_spread',
    'change_rate_ma5', 'change_rate_ma20',
    'per', 'pbr', 'eps', 'div_yield',
    'foreign_net_volume_5d', 'foreign_net_volume_20d',
    'institution_net_volume_5d',    'institution_net_volume_20d',
    'individual_net_volume_5d',    'individual_net_volume_20d',
    'shorting_ratio_ma10', 'shorting_bal_ma10', 'excess_return_ma20'
]

class create_features:
    def __init__(self):
        db = DataBase()
        self.engine = db.connect()
        with self.engine.connect() as conn:
            self.data = pd.read_sql(text(
                """
                SELECT
                    p.ticker, p.date, p.stock_high, p.stock_low, p.stock_close, p.stock_volume, p.stock_change,
                    f.per, f.pbr, f.eps, f.div_yield,
                    i.foreign_net_volume, i.institution_net_volume, i.individual_net_volume,
                    s.shorting_volume_ratio, s.shorting_balance,
                    m.market_end
                FROM daily_price p
                LEFT JOIN daily_fundamental f ON p.ticker = f.ticker AND p.date = f.date
                LEFT JOIN daily_investor    i ON p.ticker = i.ticker AND p.date = i.date
                LEFT JOIN daily_shorting    s ON p.ticker = s.ticker AND p.date = s.date
                LEFT JOIN market_index      m ON p.date   = m.date
                ORDER BY p.ticker, p.date
                """
            ) ,conn)
            self.data['date'] = pd.to_datetime(self.data['date'])

    def ma_ratio(self):
        tickers = self.data.groupby('ticker')['stock_close']
        self.data['ma20_ratio'] = self.data['stock_close'] / tickers.rolling(20).mean().reset_index(level=0, drop=True)
        self.data['ma60_ratio'] = self.data['stock_close'] / tickers.rolling(60).mean().reset_index(level=0, drop=True)
        self.data['ma120_ratio'] = self.data['stock_close'] / tickers.rolling(120).mean().reset_index(level=0, drop=True)

    def change_rate(self):
        tickers = self.data.groupby('ticker')['stock_change']
        self.data['change_rate_ma5'] = tickers.rolling(5).mean().reset_index(level=0, drop=True)
        self.data['change_rate_ma20'] = tickers.rolling(20).mean().reset_index(level=0, drop=True)

    def volumes(self):
        tickers_foreign = self.data.groupby('ticker')['foreign_net_volume']
        tickers_institution = self.data.groupby('ticker')['institution_net_volume']
        tickers_individual = self.data.groupby('ticker')['individual_net_volume']
        self.data['foreign_net_volume_5d'] = tickers_foreign.rolling(5).sum().reset_index(level=0, drop=True)
        self.data['foreign_net_volume_20d'] = tickers_foreign.rolling(20).sum().reset_index(level=0, drop=True)
        self.data['institution_net_volume_5d'] = tickers_institution.rolling(5).sum().reset_index(level=0, drop=True)
        self.data['institution_net_volume_20d'] = tickers_institution.rolling(20).sum().reset_index(level=0, drop=True)
        self.data['individual_net_volume_5d'] = tickers_individual.rolling(5).sum().reset_index(level=0, drop=True)
        self.data['individual_net_volume_20d'] = tickers_individual.rolling(20).sum().reset_index(level=0, drop=True)

    def shorting(self):
        shorting_volume = self.data.groupby('ticker')['shorting_volume_ratio']
        shorting_balance = self.data.groupby('ticker')['shorting_balance']
        self.data['shorting_ratio_ma10'] = shorting_volume.rolling(10).mean().reset_index(level=0, drop=True)
        self.data['shorting_bal_ma10'] = shorting_balance.rolling(10).mean().reset_index(level=0, drop=True)

    def features_etc(self):
        # macd
        close = self.data.groupby('ticker')['stock_close']
        ema12 = close.ewm(span=12, adjust=False).mean()
        ema26 = close.ewm(span=26, adjust=False).mean()
        self.data['macd'] = (ema12-ema26).reset_index(level=0, drop=True) / self.data['stock_close']
        # rsi
        gain = close.diff()
        gain[gain<0] = 0
        loss = -close.diff()
        loss[loss<0] = 0
        avg_gain = gain.groupby(self.data['ticker']).rolling(14).mean().reset_index(level=0, drop=True)
        avg_loss = loss.groupby(self.data['ticker']).rolling(14).mean().reset_index(level=0, drop=True)
        self.data['rsi'] = 100 - 100 / (1 + avg_gain / avg_loss)
        # BB
        mid = close.rolling(20).mean().reset_index(level=0, drop=True)
        std = close.rolling(20).std().reset_index(level=0, drop=True)
        self.data['BB'] = (self.data['stock_close'] - mid + 2 * std) / (4 * std)
        # hl_spread
        self.data['hl_spread'] = (self.data['stock_high'] - self.data['stock_low']) / self.data['stock_close']
        # market_change
        market_change = self.data.groupby('ticker')['market_end'].pct_change() * 100
        excess_return= self.data['stock_change'] - market_change
        self.data['excess_return_ma20'] = excess_return.groupby(self.data['ticker']).rolling(20).mean().reset_index(level=0, drop=True)

    def correct_label(self):
        close = self.data['stock_close']
        g = self.data.groupby('ticker')['stock_close']
        upper = close * (1 + INCREASE_RATE)
        lower = close * (1 - STOP_RATE)
        n = len(close)
        first_up = np.full(n, np.inf)
        first_dn = np.full(n, np.inf)

        for k in range(1, FORWARD_DAYS + 1):
            fwd = g.shift(-k).values
            hit_up = fwd >= upper.values
            hit_dn = fwd <= lower.values
            first_up[hit_up & np.isinf(first_up)] = k
            first_dn[hit_dn & np.isinf(first_dn)] = k

        has_window = g.shift(-FORWARD_DAYS).notna().values
        target = (first_up < first_dn).astype(float)
        undecided = np.isinf(first_up) & np.isinf(first_dn)
        target[undecided & ~has_window] = np.nan
        self.data['target'] = target

def prepare():
    feature = create_features()
    feature.ma_ratio()
    feature.change_rate()
    feature.volumes()
    feature.shorting()
    feature.features_etc()
    feature.correct_label()

    data = (feature.data.dropna(subset=FEATURES + ['target'])).sort_values('date')

    split = int(len(data) * (1 - TEST_RATIO))
    train_data = data.iloc[:split]
    test_data = data.iloc[split:]

    X_train, y_train = train_data[FEATURES], train_data['target']
    X_test, y_test = test_data[FEATURES], test_data['target']
    return X_train, y_train, X_test, y_test