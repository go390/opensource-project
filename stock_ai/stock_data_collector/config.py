DB_CONFIG = {
    'host': 'localhost',
    'port': 3306,
    'user': 'root',
    'password': 'go090312',
    'database': 'stock_db',
    'charset': 'utf8mb4'
}

# DB에 데이터가 없으면 여기서부터 수집, 있으면 마지막 저장일 다음날부터 수집
# 두 DATE 모두 "yyyymmdd" 형식으로 작성되어야함
START_DATE = '20200101'
END_DATE = None  # None이면 최근 영업일로 자동 설정

MARKET = 'KOSPI'  # KOSPI 또는 KOSDAQ
SLEEP_TIME = 0.3  # pykrx 요청 간 딜레이시간

INCREASE_RATE = 0.05
FORWARD_DAYS  = 30
TEST_RATIO    = 0.2
MODEL_PATH    = 'model.lgb'