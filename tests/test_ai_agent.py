import json

from app.ai_agent import build_messages, _image_block
from app.schemas import AnalysisReport


def test_build_messages_includes_snapshot_and_notes():
    msgs = build_messages({"symbol": "BTCUSDT"}, "moje poznámky", ["data:image/png;base64,aGVsbG8=", "nie-obrazok"])
    assert msgs[0]["role"] == "user"
    types = [b["type"] for b in msgs[0]["content"]]
    assert types == ["image", "text"]
    assert "moje poznámky" in msgs[0]["content"][-1]["text"]


def test_image_block_rejects_bad_data():
    assert _image_block("data:image/png;base64,***") is None
    assert _image_block("http://x/y.png") is None


def test_report_schema_is_strict_json_schema():
    schema = AnalysisReport.model_json_schema()
    assert schema["type"] == "object"
    assert "watch_tips" in schema["required"]
    # musí byť serializovateľná pre output_config.format
    json.dumps(schema)
