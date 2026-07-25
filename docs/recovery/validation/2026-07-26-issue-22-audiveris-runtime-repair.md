# Validation — issue #22 / native Audiveris runtime repair

Date: 2026-07-26
Commit: `4613e08` (branch `codex/p1-omr-audiveris-runtime`, PR #36)
Environment: macOS (Darwin 25.5.0), Python 3.14, Node/Jest jsdom. Docker CLI 29.4.0
is installed but its daemon is not running. `flyctl` is installed but no Fly access token is
available.

## Claim being verified

That the repository-side OMR path now matches the actual Audiveris 5.11.0 Ubuntu package and export
contract without restoring a demo success path:

- the converter accepts the `.mxl` container Audiveris exports;
- the processor invokes the official native launcher and passes a folder to `-output`;
- `app.py` cannot select Docker-in-Docker or demo processors;
- the image definition installs the checksum-pinned package, its separate English OCR data, and
  uses the package's bundled JRE;
- one 3GB Audiveris JVM can run at a time on the provisional 4GB VM;
- a hung, timed-out, or cancelled Audiveris process is killed and reaped before its slot is reused;
- multiple `.mxl` results fail explicitly rather than storing a partial score.

This record does **not** claim that the image builds, a real PDF converts, or Fly serves the change.

## Audiveris 5.11.0 package investigation

The unresolved question from the 2026-07-25 audit is answered: the Ubuntu 22.04 `.deb` bundles its
own JRE. No system JRE/JDK should be installed.

| Evidence | Result |
|---|---|
| Official binary-install documentation | installers include their own JRE; Linux launcher is `/opt/audiveris/bin/Audiveris` |
| GitHub release asset | `Audiveris-5.11.0-ubuntu22.04-x86_64.deb`, 78,048,872 bytes |
| Release API digest and downloaded file | SHA-256 both `ae714594f40e54b1a4951fc3f914f08ae38fe5d07b7f2283b1a904fdb6e0a318` |
| Package contents | `/opt/audiveris/lib/runtime/bin/java`, `/opt/audiveris/lib/runtime/lib/server/libjvm.so`, `/opt/audiveris/bin/Audiveris` |
| Bundled runtime | Java `25.0.3` |
| Actual application JAR | `/opt/audiveris/lib/app/audiveris.jar`; the two paths old `audiveris.py` searched do not exist |
| Launcher config | `/opt/audiveris/lib/app/Audiveris.cfg` contains `-Xms512m`, `-Xmx8G` |
| OCR content | Tesseract/Leptonica native libraries are bundled, but zero `*.traineddata` files are present |
| Debian dependencies | X11/libc/zlib/xdg dependencies; no Java or Tesseract package dependency |

Primary sources:

- https://audiveris.github.io/audiveris/_pages/tutorials/install/binaries/
- https://github.com/Audiveris/audiveris/releases/tag/5.11.0
- https://audiveris.github.io/audiveris/_pages/guides/advanced/cli/
- https://audiveris.github.io/audiveris/_pages/guides/main/languages/

## Regression-first evidence

The first focused run after adding tests failed as intended:

- `.mxl` input reached `ET.parse()` as a ZIP and failed with `ParseError`;
- `AudiverisProcessor` had no native launcher injection contract;
- `app.py` still imported Docker and demo processors;
- the Dockerfile had no pinned Audiveris package, OCR data, or heap adjustment;
- `fly.toml` still declared 512MB.

Independent review then found two further runtime risks. New tests failed before those fixes:

- concurrent uploads could start multiple 3GB JVMs on one 4GB VM;
- multiple `.mxl` exports were silently reduced to the first file.

Both now have behavior tests: conversions serialize at one JVM, and multiple outputs raise an
explicit unsupported error.

Hosted review then found that a hung conversion or `-version` validation could wait forever. New
tests failed because `AudiverisProcessor` had no timeout parameter. After a 900-second conversion
timeout and a 30-second validation cap were added, an independent cancellation review exposed one
more lifecycle edge: cancelling the caller released the semaphore while its child stayed alive.
That regression also failed first. Timeout and `asyncio.CancelledError` now share kill/wait cleanup,
and the cancellation test waits until `communicate()` has actually begun before cancelling.

## Final commands and results

| Command | Result |
|---|---|
| `npm test -- --runInBand src/utils/__tests__/converterCorpus.test.ts src/utils/__tests__/omrRuntimeContract.test.ts` | PASS — 2 suites / 11 Jest tests |
| `python3 -m unittest discover -s tests -p test_audiveris_runtime.py` | PASS — 9 Python tests |
| `python3 -m py_compile app.py omr/audiveris.py omr/converter.py tests/test_audiveris_runtime.py` | PASS |
| `npm test -- --runInBand` | PASS — 42 suites / 389 tests |
| `npx tsc --noEmit` | PASS — exit 0 |
| `npm run lint` | PASS — no warnings or errors |
| `npm run build` | PASS — production build emitted 40 routes; build reports that it skips lint/type validation, which were run separately above |
| `git diff --check` | PASS |
| `docker info` | FAIL — Docker daemon socket absent; no image build attempted |
| `flyctl config validate --config omr-service/fly.toml` | BLOCKED — CLI started but reported no Fly access token; schema was not validated |
| `npm audit --audit-level=high` | BLOCKED — restricted network failed, and escalation was rejected because it would send the dependency graph to a third party |

Baseline: PR #35 recorded 41 suites / 387 tests. PR #36 adds one Jest suite and two Jest-visible
cases; its Python subprocess runs nine internal tests.

## Independent review

The first read-only review reported three findings:

1. HIGH — unrestricted background jobs could run multiple 3GB JVMs on a 4GB VM;
2. MEDIUM — multiple `.mxl` outputs silently returned only the first;
3. LOW — runtime/container test names overstated static configuration evidence.

All three were fixed. The follow-up review found zero new blockers and confirmed the behavior/static
contract naming, semaphore test, and explicit multi-output failure.

CodeRabbit then reported the missing conversion and validation timeouts. Both were fixed. Its claim
that `Audiveris.cfg` was unused was disproved with the inspected 5.11.0 package; the build now
asserts the exact rewritten heap line, CodeRabbit withdrew the finding, and the thread is resolved.
The final independent review found and then verified the caller-cancellation cleanup. Its follow-up
reported zero actionable issues and confirmed timeout/cancellation process termination with
`returncode=-9`. CodeRabbit's final-commit review was rate limited.

## Hosted verification

Final head `4613e0823763d6ceedfed513b8abc26bb88844b8` passed both hosted workflows on
2026-07-26 KST:

- Tests run `30164315163`: `Run Tests`, `Lint`, `Security Audit`, `E2E Tests`;
- PR Checks run `30164315135`: `Detect changes`, `Lint and Type Check`, `Unit Tests`, `E2E Tests`,
  `All Checks Complete`, `PR Summary`;
- Vercel and Vercel Preview Comments.

Change-conditioned `Build Check`, `Security Scan`, and `Accessibility Check` were skipped. None of
these jobs builds `omr-service/Dockerfile.audiveris`.

## Gaps and risks

- **Docker image build/run is unverified.** The pinned package installation, launcher, traineddata
  path, and heap rewrite are static contracts until a Docker-capable runner executes them.
- **No real PDF was converted.** The `.mxl` test packages a golden MusicXML fixture and drives it
  through `omr/cli.py`; Audiveris recognition quality and launcher/native-library behavior remain
  unmeasured.
- **No Fly deployment occurred.** The 4GB VM / 3GB heap values are provisional, and `fly.toml`
  schema validation could not authenticate.
- English is the only provisioned OCR language.
- Audiveris can emit more than one `.mxl`; this change fails honestly in that case. Deliberate
  multi-result combination remains future work.
- PR #36 passed hosted CI and has no known actionable review item, but still needs the user's
  explicit merge approval. Until it is merged and the OMR service is separately deployed,
  production upload remains in the intended visible-failure state.
