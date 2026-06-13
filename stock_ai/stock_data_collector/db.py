import logging
import pymysql
from sqlalchemy import create_engine, text
from .config import DB_CONFIG

log = logging.getLogger(__name__)

class DataBase:
    def __init__(self):
        self.config = DB_CONFIG
        self.engine = None

    def create_database(self):
        db = pymysql.connect(
            host = self.config['host'],
            port = self.config['port'],
            user = self.config['user'],
            password = self.config['password'],
            charset = self.config['charset']
        )
        try:
            db.cursor().execute(
                f"CREATE DATABASE IF NOT EXISTS {self.config['database']} DEFAULT CHARACTER SET {self.config['charset']}"
            )
            db.commit()
        finally:
            db.close()

    def connect(self):
        url = (
            f"mysql+pymysql://{self.config['user']}:{self.config['password']}@"
            f"{self.config['host']}:{self.config['port']}/{self.config['database']}"
            f"?charset={self.config['charset']}"
        )
        self.engine = create_engine(url, pool_pre_ping=True, future=True)
        return self.engine

    def create_tables(self):
        with self.engine.begin() as db_transaction:
            for data in stock_data:
                db_transaction.execute(text(data))

    def last_modified_date(self, table):
        try:
            with self.engine.connect() as conn:
                row = conn.execute(
                    text(f"SELECT MAX(date) FROM `{table}`")
                ).fetchone()
                if row and row[0]:
                    return row[0]
        except Exception:
            log.exception(f"getting date from {table} failed")
        return None

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
        div_yield   DECIMAL(10, 4),
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
        market_open                 DECIMAL(10, 4),
        market_high                 DECIMAL(10, 4),
        market_low                  DECIMAL(10, 4),
        market_end                  DECIMAL(10, 4),
        market_volume               BIGINT,
        PRIMARY KEY (date),
        INDEX idx_date (date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """
]