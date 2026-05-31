import logging
import numpy as np
import pandas as pd
import pymysql
from sqlalchemy import create_engine, text
from config import DB_CONFIG, stock_data

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
        db_transaction = self.engine.begin()
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