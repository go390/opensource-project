DB_CONFIG = {
    'host': 'localhost',
    'port': 3306,
    'user': 'root',
    'password': 'go090312', #your DB password
    'database': 'stock_db', # your DB
    'charset': 'utf8mb4'
}

"""
if there is no data on DB, it will collect from the start_date,
if there is data on DB, it will collect from the last_modified_date
two DATE should follow the form of "yyyymmdd"
if the END_DATE is None it will be set to last business day
"""

START_DATE = '20200101'
END_DATE = None

MARKET = 'KOSPI' # KOSPI or KOSDAQ
SLEEP_TIME = 0.5 # delay time for calling pykrx (if it is too short you can be banned by the krx)

INCREASE_RATE = 0.05
FORWARD_DAYS  = 30
TEST_RATIO    = 0.2
MODEL_PATH    = 'model.lgb'