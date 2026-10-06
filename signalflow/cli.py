"""CLI: python -m signalflow <príkaz>"""
from __future__ import annotations

import argparse
import logging
import sys

from .config import load_settings
from .pipeline import Pipeline, format_results


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="signalflow", description="Telegram tipy -> VIP skupiny -> IG/X/FB kontent")
    parser.add_argument("--config", default="config.yaml")
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("run", help="spustí Telegram bota (príjem + schvaľovanie + publikovanie)")

    p = sub.add_parser("preview", help="vygeneruje obrázky a texty zo zadaného textu bez publikovania")
    p.add_argument("text", nargs="?", help="text signálu (ak chýba, číta sa zo stdin)")

    p = sub.add_parser("publish", help="publikuje už uložený signál")
    p.add_argument("id")
    p.add_argument("--scope", choices=["all", "vip", "public"], default="all")

    p = sub.add_parser("result", help="zverejní výsledok obchodu (TP/SL)")
    p.add_argument("id")
    p.add_argument("kind", choices=["tp", "sl"])
    p.add_argument("index", nargs="?", type=int, default=None, help="číslo TP (1, 2, ...)")
    p.add_argument("--price", type=float, default=None)
    p.add_argument("--scope", choices=["all", "vip", "public"], default="all")
    p.add_argument("--dry-run", action="store_true", help="len vygeneruje súbory")

    sub.add_parser("list", help="vypíše uložené signály")

    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    settings = load_settings(config_file=args.config)

    if args.cmd == "run":
        from .bot import run_bot
        run_bot(settings)
        return 0

    pipeline = Pipeline(settings)

    if args.cmd == "preview":
        text = args.text or sys.stdin.read()
        signal = pipeline.ingest(text, source="cli")
        if not signal:
            print("Text sa nepodarilo rozpoznať ako signál.")
            return 1
        content = pipeline.build_content(signal)
        print(f"Signál {signal.id}: {signal.pair} {signal.direction}")
        print(f"Súbory: {pipeline.signal_dir(signal)}")
        for name, path in content.images.items():
            print(f"  {name}: {path}")
        print("\n--- Telegram VIP ---\n" + content.texts["telegram_vip"])
        print("\n--- X ---\n" + content.texts["x"])
        return 0

    if args.cmd == "list":
        for s in pipeline.store.list(limit=50):
            print(f"{s.id}  {s.pair:<10} {s.direction:<5} {s.status:<10} -> {', '.join(s.published_to)}")
        return 0

    signal = pipeline.store.load(args.id)
    if not signal:
        print("Signál sa nenašiel.")
        return 1

    if args.cmd == "publish":
        content = pipeline.build_content(signal)
        print(format_results(pipeline.publish(signal, content, args.scope)))
        return 0

    if args.cmd == "result":
        try:
            return _result(pipeline, signal, args)
        except ValueError as exc:
            print(f"Chyba: {exc}")
            return 1
    return 0


def _result(pipeline, signal, args) -> int:
    if args.dry_run:
        content = pipeline.build_result_content(signal, args.kind, args.index, args.price)
        print(f"Súbory: {pipeline.signal_dir(signal)}")
        print(content.texts["telegram_vip"])
        return 0
    print(format_results(pipeline.publish_result(signal, args.kind, args.index, args.price, args.scope)))
    return 0
