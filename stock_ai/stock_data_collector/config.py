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

stock_data = [
    """
    CREATE TABLE IF NOT EXISTS company_info (
        ticker      VARCHAR(10)  PRIMARY KEY,
        name        VARCHAR(100) NOT NULL,
        market      VARCHAR(20),
        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
                    ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """,

    """
    CREATE TABLE IF NOT EXISTS daily_price (
        ticker          VARCHAR(10) NOT NULL,
        date            DATE        NOT NULL,
        stock_open      BIGINT,
        stock_high      BIGINT,
        stock_low       BIGINT,
        stock_close     BIGINT,
        stock_volume    BIGINT,
        trading_value   BIGINT,
        stock_change    DECIMAL(10, 4),
        market_cap      BIGINT,
        listed_shares   BIGINT,
        PRIMARY KEY (ticker, date),
        INDEX idx_date (date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """,

    """
    CREATE TABLE IF NOT EXISTS daily_fundamental (
        ticker      VARCHAR(10) NOT NULL,
        date        DATE        NOT NULL,
        bps         BIGINT,
        per         DECIMAL(14, 4),
        pbr         DECIMAL(14, 4),
        eps         BIGINT,
        div         DECIMAL(10, 4),
        dps         BIGINT,
        PRIMARY KEY (ticker, date),
        INDEX idx_date (date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """,

    """
    CREATE TABLE IF NOT EXISTS daily_investor (
        ticker                  VARCHAR(10) NOT NULL,
        date                    DATE        NOT NULL,
        foreign_net_volume      BIGINT,
        foreign_net_value       BIGINT,
        institution_net_volume  BIGINT,
        institution_net_value   BIGINT,
        individual_net_volume   BIGINT,
        individual_net_value    BIGINT,
        PRIMARY KEY (ticker, date),
        INDEX idx_date (date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """,

    """
    CREATE TABLE IF NOT EXISTS daily_shorting (
        ticker                  VARCHAR(10) NOT NULL,
        date                    DATE        NOT NULL,
        shorting_volume         BIGINT,
        shorting_volume_ratio   DECIMAL(10, 4),
        shorting_balance        BIGINT,
        shorting_balance_ratio  DECIMAL(10, 4),
        PRIMARY KEY (ticker, date),
        INDEX idx_date (date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """,

    """
    CREATE TABLE IF NOT EXISTS market_index (
        date            DATE        NOT NULL,
        market_open                 BIGINT,
        market_high                 BIGINT,
        market_low                  BIGINT,
        market_end                  BIGINT,
        market_volume               BIGINT,
        PRIMARY KEY (date),
        INDEX idx_date (date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """    
]
