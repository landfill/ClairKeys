"""
CLI entry point for the MusicXML → ClairKeys converter.

Runs `MusicXMLToClairKeysConverter.convert` on a single MusicXML file and prints
the canonical animation JSON to stdout. This is the seam the P0-B accuracy gate
(`src/utils/__tests__/converterCorpus.test.ts`) drives: the Jest test spawns this
CLI per golden fixture and scores stdout with `compareAnimationData`.

Usage:
    python -m omr.cli path/to/input.musicxml [--title T] [--composer C]
"""

import argparse
import asyncio
import json
import sys
from pathlib import Path

from omr.converter import MusicXMLToClairKeysConverter


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Convert MusicXML to ClairKeys animation JSON")
    parser.add_argument("input", type=Path, help="Path to input MusicXML file")
    parser.add_argument("--title", default=None, help="Optional title override")
    parser.add_argument("--composer", default=None, help="Optional composer override")
    args = parser.parse_args(argv)

    converter = MusicXMLToClairKeysConverter()
    data = asyncio.run(converter.convert(args.input, args.title, args.composer))
    json.dump(data, sys.stdout, ensure_ascii=False)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
