# Validation — issue #22 / omr-service Audiveris runtime audit

Date: 2026-07-25
Commit: `07d2100` (`main`)
Environment: macOS (Darwin 25.5.0). Docker CLI 29.4.0 installed but **daemon not running**;
`flyctl` present. No OMR service was contacted and no container was built.

## Claim being verified

Whether fixing the two causes issue #22 records — no Audiveris in the image, and the Docker
processor being selected at import time — would be enough to make `omr-service` convert a PDF.

**It would not.** Two further breaks sit behind them, and neither is mentioned in the issue or in
D-008. The pipeline has never run end to end.

## Findings

### Confirmed: the two causes already filed

1. **No Audiveris or JRE in the deployed image.** `omr-service/fly.toml` builds
   `Dockerfile.audiveris`, which installs `python3`, `pip`, and XML/zlib headers, then
   `CMD ["python3", "app.py"]`. No JDK, no Audiveris.
   - Note: `omr-service/Dockerfile` (unused) *does* install `openjdk-11-jdk` — but it then creates
     `/opt/audiveris/bin/audiveris` as a **shell script that echoes "Audiveris placeholder"**. The
     same shape as the `pdfParser` demo stub P1-A just removed on the TypeScript side.
2. **Processor selection happens at import time.** `omr-service/app.py:24-33` tries
   `from omr.audiveris_docker import ...` first. That module imports only stdlib
   (`asyncio`, `subprocess`, `os`, `tempfile`, `shutil`), so the import always succeeds and
   `AudiverisDockerProcessor` is always chosen. `audiveris_docker.py:51` shells out to
   `docker run --rm ... toprock/audiveris`; Fly machines have no Docker daemon, so it fails and
   `process_pdf_background` marks the job `FAILED`.

### New: two more breaks behind them

3. **`audiveris.py` passes a file path where Audiveris expects a folder.**
   `omr-service/omr/audiveris.py` builds `-output str(musicxml_path)` where `musicxml_path` is
   `output_dir / "output.xml"`. Per the Audiveris CLI reference, `-output <output-folder>` is
   "the path to the target output folder, where all output files (.omr, .mxl, etc) should be
   stored" — a directory, not a filename.
4. **`-export` produces `.mxl`, and the converter cannot read it.** Audiveris exports MusicXML
   "into one or several `.mxl` files in the book folder". `.mxl` is a zip container. But
   `omr-service/omr/converter.py:49` calls `ET.parse(musicxml_path)` directly, which fails on a zip.
   `audiveris.py`'s own fallback search is `output_dir.glob("*.xml")`, which will not find `.mxl`
   either.

   This is why P0-B did not surface it: `converterCorpus.test.ts` drives `omr/cli.py` with
   `fixtures/animation-contract/*/input.musicxml` — plain XML. The converter has **never received a
   real Audiveris artifact**.

### Also confirmed

- `fly.toml` `[[vm]] memory = "512mb"`, and `audiveris.py` caps the JVM at `-Xmx400m`. Both are
  low for Audiveris.
- Audiveris **5.11.0** was released 2026-07-11 and ships
  `Audiveris-5.11.0-ubuntu22.04-x86_64.deb`. `Dockerfile.audiveris` is already `FROM ubuntu:22.04`,
  so that asset matches the existing base image.

## Commands and results

| Command | Result | Evidence |
|---|---|---|
| Read `fly.toml`, all three Dockerfiles, `app.py`, `audiveris*.py`, `converter.py`, `cli.py` | done | findings above |
| `docker info` | FAIL | daemon not running — no image build was attempted |
| `which flyctl` | present | `/opt/homebrew/bin/flyctl` |
| GitHub releases API for Audiveris | 5.11.0, 2026-07-11 | `.deb` assets for ubuntu 22.04 and 24.04 |
| Audiveris CLI reference (docs + wiki) | `-batch`, `-export`, `-output <folder>` | `-output` is a folder; export yields `.mxl` |

## Proposed fix, and what each part can be verified against

| # | Change | Locally verifiable? |
|---|---|---|
| 1 | `converter.py` accepts `.mxl` — detect the zip, read `META-INF/container.xml`, parse the referenced root file | **Yes** — build an `.mxl` fixture and drive it through `omr/cli.py`, the seam `converterCorpus.test.ts` already uses |
| 2 | `audiveris.py` passes a folder to `-output` and locates the produced `.mxl` | **Yes** — assert on the constructed argv without running Audiveris |
| 3 | `app.py` drops the Docker processor; import the native one directly | **Yes** — static assertion that `audiveris_docker` is gone |
| 4 | `Dockerfile.audiveris` installs a JRE, the Audiveris `.deb`, and Tesseract language data | **No** — needs a Docker daemon; correctness only provable by building |
| 5 | `fly.toml` memory raised; `-Xmx` raised to match | **No** — provable only by deploying |

Items 1–3 can land with real regression evidence. Items 4–5 cannot be verified from this
environment and must be marked as such.

## Gaps and risks

- **Nothing here was executed.** Every finding comes from reading source and the Audiveris CLI
  reference. No container was built, no PDF was converted, no OMR service was contacted.
- The live Fly instance's state is still unverified — it is reported stopped, and this audit did not
  check.
- Whether Audiveris 5.11's `.deb` bundles its own JRE (jpackage) or needs a system JDK was **not**
  determined. It changes what `Dockerfile.audiveris` must install and what the executable path is.
  Resolve before writing the Dockerfile.
- D-008 (hosting: reuse Fly vs move to Cloud Run) is still `Proposed`. Items 1–3 are host-agnostic —
  D-008 itself says the container fix is required either way — but item 5's specific numbers depend
  on the host.
