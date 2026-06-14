import inspect
from pykrx import stock

for name in dir(stock):
    if name.startswith('get_'):
        f = getattr(stock, name)
        try:
            sig = inspect.signature(f)
            print(f"{name}: {sig}")
        except Exception:
            pass
