import json

from app.tradingview import normalize_symbol, normalize_timeframe, parse_webhook


def test_normalize():
    assert normalize_symbol("BINANCE:BTCUSDT.P") == "BTCUSDT"
    assert normalize_symbol("ethusdtperp") == "ETHUSDT"
    assert normalize_symbol("BTC-USDT") == "BTCUSDT"
    assert normalize_timeframe("240") == "4h"
    assert normalize_timeframe("D") == "1d"
    assert normalize_timeframe("15") == "15m"
    assert normalize_timeframe("4h") == "4h"


def test_parse_json_webhook():
    body = json.dumps({"secret": "x", "symbol": "BTCUSDT.P", "interval": "60", "close": "65000.5", "event": "upper_touch"}).encode()
    d = parse_webhook(body, "application/json")
    assert d["secret"] == "x" and d["symbol"] == "BTCUSDT" and d["timeframe"] == "1h"
    assert d["price"] == 65000.5 and d["event"] == "upper_touch"


def test_parse_text_webhook():
    d = parse_webhook(b"symbol=ETHUSDT tf=240 event=lower_touch price=3000", "text/plain")
    assert d["symbol"] == "ETHUSDT" and d["timeframe"] == "4h" and d["price"] == 3000.0
    assert "lower_touch" in d["event"]
