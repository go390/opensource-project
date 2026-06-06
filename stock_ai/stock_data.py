from stock_data_collector.config import DB_CONFIG, INCREASE_RATE, FORWARD_DAYS, TEST_RATIO, MODEL_PATH
from stock_data_collector.db import DataBase
import pandas as pd
import numpy as np

db = DataBase(DB_CONFIG)
db.connect()

FEATURES = [
    'close_ma5_ratio', 'close_ma20_ratio', 'close_ma60_ratio', 'close_ma120_ratio',
    'vol_ratio', 'rsi', 'macd', 'BB', 'hl_spread',
    'change_rate', 'change_rate_ma5', 'change_rate_ma20',
    'per', 'pbr', 'eps', 'div_yield',
    'foreign_net_volume_5d', 'foreign_net_volume_20d',
    'institution_net_volume_5d',    'institution_net_volume_20d',
    'individual_net_volume_5d',    'individual_net_volume_20d',
    'shorting_ratio_ma10', 'shorting_bal_ma10',
]

def load_data():
    query = """
    SELECT
        p.ticker,
        p.date,
        p.open, p.high, p.low, p.close, p.volume,
        p.change_rate,
        p.market_cap,
        f.per, f.pbr, f.eps, f.div_yield,
        i.foreign_net_volume,
        i.institutionitution_net_volume,
        i.individual_net_volume,
        s.shorting_volume_ratio,
        s.shorting_balance_ratio
    FROM daily_price p
    LEFT JOIN daily_fundamental f ON p.ticker = f.ticker AND p.date = f.date
    LEFT JOIN daily_investor i    ON p.ticker = i.ticker AND p.date = i.date
    LEFT JOIN daily_shorting s    ON p.ticker = s.ticker AND p.date = s.date
    ORDER BY p.ticker, p.date
    """
    data_frame = pd.read_sql(query, db.engine)
    data_frame['date'] = pd.to_datetime(data_frame['date'])
    return data_frame.sort_values(['ticker', 'date']).reset_index(drop=True)


def create_features(dataframe):
    g = dataframe.groupby('ticker')

    for period in [5, 20, 60, 120]:
        dataframe[f'ma{period}'] = g['close'].transform(
            lambda x, p=period: x.rolling(p).mean()
        )

    for period in [5, 20, 60, 120]:
        dataframe[f'close_ma{period}_ratio'] = dataframe['close'] / dataframe[f'ma{period}']

    vol_ma20 = g['volume'].transform(lambda x: x.rolling(20).mean())
    dataframe['vol_ratio'] = dataframe['volume'] / vol_ma20.replace(0, np.nan)

    dataframe['rsi']  = g['close'].transform(rsi)
    dataframe['macd'] = g['close'].transform(calc_macd)
    dataframe['BB']   = g['close'].transform(calc_bb_pos)

    dataframe['hl_spread'] = (dataframe['high'] - dataframe['low']) / dataframe['close'].replace(0, np.nan)

    dataframe['change_rate_ma5']  = g['change_rate'].transform(lambda x: x.rolling(5).mean())
    dataframe['change_rate_ma20'] = g['change_rate'].transform(lambda x: x.rolling(20).mean())

    for col in ['foreign_net_volume', 'institution_net_volume', 'individual_net_volume']:
        for days in [5, 20]:
            dataframe[f'{col}_{days}d'] = g[col].transform(
                lambda x, d=days: x.rolling(d).sum()
            )

    dataframe['shorting_ratio_ma10'] = g['shorting_volume_ratio'].transform(lambda x: x.rolling(10).mean())
    dataframe['shorting_bal_ma10']   = g['shorting_balance_ratio'].transform(lambda x: x.rolling(10).mean())
    dataframe.drop(columns=['ma5', 'ma20', 'ma60', 'ma120'], inplace=True)

    return dataframe

# RSI (14일 기본)
def rsi(series, period=14):
    delta = series.diff()
    gain = delta.clip(lower=0).rolling(period).mean()
    loss = (-delta.clip(upper=0)).rolling(period).mean()
    rs = gain / loss.replace(0, np.nan)
    return 100 - (100 / (1 + rs))

# MACD 히스토그램 (12/26/9)
def calc_macd(series):
    ema12  = series.ewm(span=12, adjust=False).mean()
    ema26  = series.ewm(span=26, adjust=False).mean()
    macd   = ema12 - ema26
    signal = macd.ewm(span=9, adjust=False).mean()
    return macd - signal

# 볼린저 밴드 %B
def calc_bb_pos(series, period=20, k=2):
    ma    = series.rolling(period).mean()
    std   = series.rolling(period).std()
    upper = ma + k * std
    lower = ma - k * std
    width = (upper - lower).replace(0, np.nan)
    return (series - lower) / width

def future_rise(series):
    arr = series.values
    n = len(arr)
    labels = np.full(n, np.nan)
    for i in range(n):
        future = arr[i + 1: i + 1 + FORWARD_DAYS]
        if len(future) == 0 or arr[i] <= 0:
            continue
        max_return = (future.max() - arr[i]) / arr[i]
        labels[i]  = 1 if max_return >= INCREASE_RATE else 0
    return pd.Series(labels, index=series.index)

def create_labels(dataframe):
    dataframe['label'] = dataframe.groupby('ticker')['close'].transform(future_rise)
    return dataframe

def split_data(dataframe):
    dataframe = dataframe.dropna(subset=FEATURES + ['label']).copy()
    dataframe['label'] = dataframe['label'].astype(int)

    dates  = np.sort(dataframe['date'].unique())
    cutoff = dates[int(len(dates) * (1 - TEST_RATIO))]

    train = dataframe[dataframe['date'] < cutoff]
    test  = dataframe[dataframe['date'] >= cutoff]

    return train[FEATURES], train['label'], test[FEATURES], test['label']

def prepare():
    dataframe = load_data()
    dataframe = create_features(dataframe)
    dataframe = create_labels(dataframe)
    return split_data(dataframe)