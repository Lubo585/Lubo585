from signalflow.models import Signal
from signalflow.pipeline import Pipeline, format_results
from signalflow.publishers.base import Content, Publisher, PublishResult
from signalflow.templates import build_result_texts, build_texts

TEXT = """BTC/USDT LONG 10x
Entry: 62000-62500
TP1: 63500
TP2: 65000
SL: 60800"""


class FakePublisher(Publisher):
    def __init__(self, name, scope, ok=True):
        self.name, self.scope, self.ok = name, scope, ok
        self.calls = []

    def publish(self, signal, content):
        self.calls.append((signal.id, content.is_result))
        return PublishResult(self.name, self.ok)


def test_templates_teaser_hides_numbers(settings):
    signal = Signal(pair="BTC/USDT", direction="LONG", entries=[62000, 62500],
                    targets=[63500], stop_loss=60800, leverage=10)
    texts = build_texts(signal, settings)
    assert "62 000" in texts["telegram_vip"]
    assert "60 800" in texts["telegram_vip"]
    assert "62 000" not in texts["x"]
    assert len(texts["x"]) <= 280
    assert "$BTC" in texts["x"]


def test_templates_full_mode(settings):
    settings.cfg["public_mode"] = "full"
    signal = Signal(pair="BTC/USDT", direction="SHORT", entries=[62000], targets=[60000], stop_loss=63000)
    texts = build_texts(signal, settings)
    assert "62 000" in texts["x"] and "60 000" in texts["facebook"]


def test_result_texts(settings):
    signal = Signal(pair="BTC/USDT", direction="LONG", entries=[62000, 62500],
                    targets=[63500, 65000], stop_loss=60800, leverage=10)
    texts = build_result_texts(signal, settings, "tp", 2)
    assert "TP2 HIT" in texts["telegram_vip"]
    assert "+44.18 %" in texts["telegram_vip"]
    sl = build_result_texts(signal, settings, "sl")
    assert "STOP LOSS" in sl["telegram_vip"] and "-" in sl["telegram_vip"]


def test_pipeline_end_to_end(settings, tmp_path):
    vip = FakePublisher("telegram_vip", "vip")
    disc = FakePublisher("discord", "vip")
    ig = FakePublisher("instagram", "public")
    pipe = Pipeline(settings, publishers=[vip, disc, ig])

    signal = pipe.ingest(TEXT, source="test")
    assert signal and pipe.store.load(signal.id).status == "pending"

    content = pipe.build_content(signal)
    for key in ("vip_square", "public_square", "public_story"):
        assert content.images[key].exists()
    assert (pipe.signal_dir(signal) / "signal_x.txt").exists()

    results = pipe.publish(signal, content, scope="vip")
    assert [r.channel for r in results] == ["telegram_vip", "discord"]
    assert ig.calls == []
    assert pipe.store.load(signal.id).status == "published"
    assert "✅ telegram_vip" in format_results(results)

    res = pipe.publish_result(signal, "tp", 1)
    assert all(r.ok for r in res) and len(res) == 3
    assert (pipe.signal_dir(signal) / "result_tp1.png").exists()
    stored = pipe.store.load(signal.id)
    assert stored.results[0]["kind"] == "tp" and stored.results[0]["pnl"].startswith("+")


def test_store_prefix_lookup(settings):
    pipe = Pipeline(settings, publishers=[])
    signal = pipe.ingest(TEXT)
    assert pipe.store.load(signal.id[:8]).id == signal.id
    assert pipe.store.list(status="pending")[0].id == signal.id


def test_result_validation(settings):
    import pytest
    pipe = Pipeline(settings, publishers=[])
    signal = pipe.ingest("BTC/USDT LONG\nEntry 60000\nTP1 61000\nSL 59000")
    with pytest.raises(ValueError):
        pipe.build_result_content(signal, "tp", 3)
    content = pipe.build_result_content(signal, "tp", 3, price=64000)
    assert content.meta["pnl_pct"].startswith("+")
