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

class create_features:
    def __init__(self):
        pass

    def ma_ratio():
        
