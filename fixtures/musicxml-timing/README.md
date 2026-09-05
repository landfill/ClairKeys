# MusicXML timing evidence

`clair-de-lune-recognition.json` holds the exact base64-encoded MXL from the 2026-09-05
same-PDF Audiveris reproduction on the production VM, its hash and the 133 note dictionaries
from the served issue #134 JSON. It is **known incorrect recognition**, not a gold standard score.

The expected ten overfull measures were measured from this XML during diagnosis. The regression
requires the converter to report them without inventing replacements for the recognized notes.
The original PDF says 9/8; this MXL says 6/8. Correcting those musical contents is a separate task.

Source and chain: `docs/recovery/validation/2026-09-05-issue-134-vm-reproduction.md`.
No PDF or pixel images are retained. The compressed container contains only `input.xml` and
`META-INF/container.xml`, which D-040 permits retaining for concrete diagnostic needs.
