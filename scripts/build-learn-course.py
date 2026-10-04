"""Build the authored MusicXML course offline; --check rejects stale assets.

Run with the same Python environment as the converter corpus tests.
No OMR, credentials, network, storage service or database is used.
"""
import argparse
import asyncio
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'omr-service'))
from omr.converter import MusicXMLToClairKeysConverter  # noqa: E402


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    directory = ROOT / 'public' / 'learn' / 'course'
    sources = sorted(directory.glob('*.musicxml'))
    if not sources:
        raise SystemExit('No authored course sources')
    converter = MusicXMLToClairKeysConverter()
    for source in sources:
        animation, score = asyncio.run(converter.convert_with_artifact(source))
        animation.pop('generated_at', None)
        for kind, value in [('animation', animation), ('score', score)]:
            output = source.with_suffix(f'.{kind}.json')
            content = json.dumps(value, ensure_ascii=False, indent=2) + '\n'
            if args.check:
                if not output.exists() or output.read_text() != content:
                    raise SystemExit(f'Stale course asset: {output.relative_to(ROOT)}')
            else:
                output.write_text(content)
    print(f'{len(sources)} course sources {"checked" if args.check else "built"}')


if __name__ == '__main__':
    main()
