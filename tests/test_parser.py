from signalflow.parser import parse_regex, parse_signal

SAMPLES = {
    "classic": """🚀 #BTC/USDT LONG 10x
Entry: 62,000 - 62,500
TP1: 63,500
TP2: 65,000
TP3: 67,200
SL: 60,800
Timeframe: 4H""",
    "words": """ETH SHORT
Entry zone 2450-2480
Target 1 2380
Target 2 2300
Stop loss 2535
Lev 20x""",
    "slovak": """$SOL long, páka x5
vstup: 142.5
cieľ: 150 / 158
sl: 136""",
    "inline": "BTCUSDT.P Buy | Entry 61900 | TP 63000, 64500 | SL 60500 | 25x",
    "small_cap": """PEPE/USDT LONG
Entry 0.00001050 - 0.00001080
TP1 0.00001150
SL 0.00000980""",
}


def test_classic():
    s = parse_regex(SAMPLES["classic"])
    assert s and s.pair == "BTC/USDT" and s.direction == "LONG"
    assert s.entries == [62000.0, 62500.0]
    assert s.targets == [63500.0, 65000.0, 67200.0]
    assert s.stop_loss == 60800.0
    assert s.leverage == 10
    assert s.timeframe == "4H"


def test_words_and_short():
    s = parse_regex(SAMPLES["words"])
    assert s and s.pair == "ETH/USDT" and s.direction == "SHORT"
    assert s.entries == [2450.0, 2480.0]
    assert s.targets == [2380.0, 2300.0]
    assert s.stop_loss == 2535.0
    assert s.leverage == 20


def test_slovak_labels():
    s = parse_regex(SAMPLES["slovak"])
    assert s and s.pair == "SOL/USDT" and s.direction == "LONG"
    assert s.entries == [142.5]
    assert s.targets == [150.0, 158.0]
    assert s.stop_loss == 136.0
    assert s.leverage == 5


def test_inline_format():
    s = parse_regex(SAMPLES["inline"])
    assert s and s.pair == "BTC/USDT" and s.direction == "LONG"
    assert s.entries == [61900.0]
    assert s.targets == [63000.0, 64500.0]
    assert s.stop_loss == 60500.0
    assert s.leverage == 25


def test_small_cap_decimals():
    s = parse_regex(SAMPLES["small_cap"])
    assert s and s.entries == [0.0000105, 0.0000108]
    assert s.targets == [0.0000115]
    assert s.stop_loss == 0.0000098


def test_non_signal_returns_none():
    assert parse_regex("Ahoj, ako sa máš? Dnes nič neposielam.") is None
    assert parse_signal("BTC vyzerá dobre, ale čakám.", use_ai=False) is None


def test_pnl_and_rr():
    s = parse_regex(SAMPLES["classic"])
    assert s.pnl_pct(65000.0) == round((65000 - 62250) / 62250 * 100 * 10, 2)
    assert s.pnl_pct(60800.0) < 0
    assert s.risk_reward() == round((67200 - 62250) / (62250 - 60800), 1)
    short = parse_regex(SAMPLES["words"])
    assert short.pnl_pct(2300.0) > 0
