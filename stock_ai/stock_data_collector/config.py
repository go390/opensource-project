DB_CONFIG = {
    'host': 'localhost',
    'port': 3306,
    'user': 'root',
    'password': '88003210Onon', #your DB password
    'database': 'stocksense_stocks', # your DB
    'charset': 'utf8mb4'
}

"""
if there is no data on DB, it will collect from the start_date,
if there is data on DB, it will collect from the last_modified_date
two DATE should follow the form of "yyyymmdd"
if the END_DATE is None it will be set to last business day
"""

START_DATE = '20250101'
END_DATE = None

MARKET = 'KOSPI' # KOSPI or KOSDAQ
SLEEP_TIME = 0.5 # delay time for calling pykrx (if it is too short you can be banned by the krx)

INCREASE_RATE = 0.05
FORWARD_DAYS  = 30
TEST_RATIO    = 0.2
import os
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH    = os.path.join(BASE_DIR, 'model.lgb')

TICKERS = [
    '005930', '035420', '035720', '000660', '051910',
    '005380', '068270', '207940', '006400', '373220',
    '247540', '036570', '293490', '112040', '035900',
    '041510', '122870', '145020', '086520', '011200'
]