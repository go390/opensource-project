"""
Run this once to bootstrap the user database and all its tables.
Usage:  python -m users_db.main
"""
import logging
from .db import UserDatabase

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
)

def setup():
    db = UserDatabase()
    db.create_database()
    db.connect()
    db.create_tables()
    print("[OK] User database and tables ready.")

if __name__ == '__main__':
    setup()
