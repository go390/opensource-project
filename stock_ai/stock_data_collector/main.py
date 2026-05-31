from collector import collect
from db import DataBase

def db_upload():
    db = DataBase()
    db.create_database()
    engine = db.connect()
    db.create_tables()

    col = collect(db)
    engine = db.engine

    col.update_name(engine)
    col.update_investor(engine)
    col.update_fundamental(engine)
    col.update_price(engine)
    col.update_shorting(engine)

if __name__ == '__main__':
    db_upload()
