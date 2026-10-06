import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from signalflow.config import load_settings  # noqa: E402


@pytest.fixture
def settings(tmp_path):
    s = load_settings(ROOT)
    s.root = tmp_path
    return s
