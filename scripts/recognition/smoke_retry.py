"""Run the real processor in a separate output directory; never modifies service config."""
import argparse
import asyncio
import json
import logging
from pathlib import Path
from time import monotonic

import omr.audiveris
from omr.audiveris import AudiverisProcessor
from omr.converter import MusicXMLToClairKeysConverter
from omr.recognition_evaluation import evaluate_reference, read_musicxml


async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('pdf', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('reference', type=Path)
    args = parser.parse_args()
    if args.output.exists():
        raise ValueError('Use a new isolated output directory')
    logging.basicConfig(level=logging.INFO)
    started = monotonic()
    output = await AudiverisProcessor(process_timeout_seconds=300).process_pdf(args.pdf, args.output)
    data = await MusicXMLToClairKeysConverter().convert(output)
    report = dict(processorSource=omr.audiveris.__file__, elapsedSeconds=round(monotonic() - started, 3),
                  selectedOutput=str(output), timeSignature=data['timeSignature'],
                  notes=len(data['notes']), tempo=data['tempo'], scoreTempo=data['scoreTempo'],
                  warnings=data['metadata'].get('timingWarnings', []),
                  reference=evaluate_reference(read_musicxml(output), json.loads(args.reference.read_text())))
    (args.output / 'smoke-report.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    asyncio.run(main())
