import logging
import pymysql
from sqlalchemy import create_engine, text
from .config import USER_DB_CONFIG

log = logging.getLogger(__name__)


class UserDatabase:
    def __init__(self):
        self.config = USER_DB_CONFIG
        self.engine = None

    # ── Setup ──────────────────────────────────────────────────────────────────

    def create_database(self):
        """Create the stocksense_users database if it doesn't exist yet."""
        conn = pymysql.connect(
            host=self.config['host'],
            port=self.config['port'],
            user=self.config['user'],
            password=self.config['password'],
            charset=self.config['charset'],
        )
        try:
            conn.cursor().execute(
                f"CREATE DATABASE IF NOT EXISTS {self.config['database']} "
                f"DEFAULT CHARACTER SET {self.config['charset']}"
            )
            conn.commit()
        finally:
            conn.close()

    def connect(self):
        """Create the SQLAlchemy engine and return it."""
        url = (
            f"mysql+pymysql://{self.config['user']}:{self.config['password']}@"
            f"{self.config['host']}:{self.config['port']}/{self.config['database']}"
            f"?charset={self.config['charset']}"
        )
        self.engine = create_engine(url, pool_pre_ping=True, future=True)
        return self.engine

    def create_tables(self):
        """Create all user-related tables."""
        with self.engine.begin() as tx:
            for statement in USER_TABLES:
                tx.execute(text(statement))
        log.info("User tables created / verified.")

    # ── Convenience helpers (optional — use from your API layer) ───────────────

    def get_user_by_email(self, email: str):
        with self.engine.connect() as conn:
            row = conn.execute(
                text("SELECT * FROM users WHERE email = :email"),
                {"email": email},
            ).fetchone()
        return row

    def get_user_by_id(self, user_id: int):
        with self.engine.connect() as conn:
            row = conn.execute(
                text("SELECT * FROM users WHERE id = :id"),
                {"id": user_id},
            ).fetchone()
        return row


# ─── Table definitions ─────────────────────────────────────────────────────────

USER_TABLES = [

    # Core user account — matches LoginForm fields (name, email, password)
    """
    CREATE TABLE IF NOT EXISTS users (
        id                  INT UNSIGNED    NOT NULL AUTO_INCREMENT,
        name                VARCHAR(100)    NOT NULL,
        email               VARCHAR(255)    NOT NULL UNIQUE,
        password_hash       VARCHAR(255)    NOT NULL,
        is_active           TINYINT(1)      NOT NULL DEFAULT 1,
        created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
                                            ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """,

    # Session / auth tokens — one row per active login
    """
    CREATE TABLE IF NOT EXISTS user_sessions (
        id                  INT UNSIGNED    NOT NULL AUTO_INCREMENT,
        user_id             INT UNSIGNED    NOT NULL,
        token               VARCHAR(512)    NOT NULL UNIQUE,
        ip_address          VARCHAR(45),
        user_agent          TEXT,
        created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at          DATETIME        NOT NULL,
        PRIMARY KEY (id),
        INDEX idx_token   (token),
        INDEX idx_user_id (user_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """,

    # Watchlist — stocks a user has starred/saved
    """
    CREATE TABLE IF NOT EXISTS user_watchlist (
        id                  INT UNSIGNED    NOT NULL AUTO_INCREMENT,
        user_id             INT UNSIGNED    NOT NULL,
        ticker              VARCHAR(10)     NOT NULL,
        added_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_user_ticker (user_id, ticker),
        INDEX idx_user_id (user_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """,

    # AI signal view history — which stocks the user viewed AI analysis for
    """
    CREATE TABLE IF NOT EXISTS user_ai_views (
        id                  INT UNSIGNED    NOT NULL AUTO_INCREMENT,
        user_id             INT UNSIGNED    NOT NULL,
        ticker              VARCHAR(10)     NOT NULL,
        ai_signal           ENUM('BUY','NEUTRAL','SELL'),
        viewed_at           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_user_id  (user_id),
        INDEX idx_ticker   (ticker),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """,

    # Password reset tokens — for "Forgot password?" flow in LoginForm
    """
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id                  INT UNSIGNED    NOT NULL AUTO_INCREMENT,
        user_id             INT UNSIGNED    NOT NULL,
        token               VARCHAR(255)    NOT NULL UNIQUE,
        created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at          DATETIME        NOT NULL,
        used                TINYINT(1)      NOT NULL DEFAULT 0,
        PRIMARY KEY (id),
        INDEX idx_token   (token),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """,
]
