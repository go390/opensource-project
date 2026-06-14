from pykrx import stock

start = "20260601"
end = "20260612"

funcs = {
    "get_market_ohlcv_by_date": lambda: stock.get_market_ohlcv_by_date(start, end, "005930"),
    "get_market_cap_by_date": lambda: stock.get_market_cap_by_date(start, end, "005930"),
    "get_market_fundamental_by_date": lambda: stock.get_market_fundamental_by_date(start, end, "005930"),
    "get_market_trading_volume_by_investor": lambda: stock.get_market_trading_volume_by_investor(start, end, "005930"),
    "get_market_trading_value_by_investor": lambda: stock.get_market_trading_value_by_investor(start, end, "005930"),
    "get_shorting_balance_by_date": lambda: stock.get_shorting_balance_by_date(start, end, "005930"),
    "get_shorting_volume_by_date": lambda: stock.get_shorting_volume_by_date(start, end, "005930"),
}

for name, f in funcs.items():
    try:
        res = f()
        print(f"{name}: Success, shape = {res.shape}")
    except Exception as e:
        print(f"{name}: Failed with {type(e).__name__}: {e}")
