from stock_data_collector.main import db_upload
from predict import predict_and_store

def main():
    print("collecting market data")
    db_upload()

    print("[2/2] running prediction...")
    predict_and_store()

    print("daily run finished")

if __name__ == '__main__':
    main()