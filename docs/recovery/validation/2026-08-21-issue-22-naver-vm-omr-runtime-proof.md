# Validation — issue #22 / first real OMR runtime on the NAVER Cloud VM

Date: 2026-08-21
Commit: `43a5b14` (`main`) plus the work branch `codex/p1-omr-naver-vm-runtime` at `8045eb0`
Environment: NAVER Cloud Platform VM `vm-naver-20260820145930` (KR-1, instance `144469872`),
Rocky Linux 8.8 (kernel 4.18.0-477.27.1.el8_8), 2 vCPU, 15Gi RAM, no swap, 96G free on `/`,
SELinux `Disabled`, firewalld `inactive`, podman 4.4.1, git 2.39.3, system Python 3.6.8.

The VM's public IP is deliberately **not** recorded in this file. This repository is public and
the host currently has no OS-level firewall, so its address is looked up from the NCloud console
by the resource name above rather than published here.

## Claim being verified

That the OMR image defined by `omr-service/Dockerfile.audiveris` can actually be built and run,
and that a real sheet-music PDF passes through the whole conversion pipeline. This is the runtime
evidence PR #36 explicitly did not provide.

This record does **not** claim recognition accuracy, that the FastAPI service runs, that Supabase
upload works, or that any Next.js end-to-end path works. Those remain open — see Gaps.

## Context correction

The task was framed as migrating the OMR service from Fly.io to this VM. There is nothing to
migrate: `omr-service/fly.toml` was written but never deployed, as `HANDOFF.md` records. This is
therefore the **first** deployment of the service, and D-008 (`Proposed`, "Fly.io reuse vs Cloud
Run") does not cover the option now being taken.

Rocky 8.8 forces the container route rather than a native install:

- Audiveris 5.11.0 publishes only `.deb` artifacts for Linux (`ubuntu22.04`, `ubuntu24.04`) —
  confirmed against the GitHub releases API. There is no `.rpm`.
- Rocky 8's system Python is 3.6.8, below the 3.8 that `pydantic==2.5.0` requires, and `dnf`
  depends on that interpreter.

## Two defects found by building the image for the first time

Both are needs of the official `.deb` that its own metadata does not express, and neither is
detectable from the static checks this repository already had.

### 1. postinst desktop integration fails the whole package

`dpkg --configure` exited 3 and failed the build. Extracting the package's control scripts shows
the postinst body is only:

```sh
xdg-desktop-menu install /opt/audiveris/lib/audiveris-Audiveris.desktop
xdg-mime install /opt/audiveris/lib/audiveris-Audiveris-MimeInfo.xml
```

`xdg-utils` *is* a declared dependency and was installed, so the wrappers exist. Running one
directly gives `xdg-desktop-menu: No writable system menu directory found.` and exit 3. Three
candidates were measured:

| Candidate | apt exit | `dpkg -l` state |
|---|---|---|
| Create `/usr/share/applications` + `/usr/share/desktop-directories` only | 100 | `iF` |
| Install `desktop-file-utils` + `shared-mime-info` only | 100 | `iF` |
| **Both together** | **0** | **`ii`** |
| Shadow `xdg-desktop-menu`/`xdg-mime` with `/bin/true` in `/usr/local/bin` | 100 | `iF` |

The `/bin/true` shim fails because dpkg runs maintainer scripts with
`PATH=/usr/sbin:/usr/bin:/sbin:/bin`, which excludes `/usr/local/bin`. This was measured, not
assumed.

In every failing case the payload still unpacked, and `test -x /opt/audiveris/bin/Audiveris` and
`test -x /opt/audiveris/lib/runtime/bin/java` both passed. That is why the existing checks would
not have caught it.

### 2. Undeclared libgtk-3 dependency kills every invocation

With the package configured, `/opt/audiveris/bin/Audiveris -version` exited 1:

```
Exception in thread "main" java.lang.UnsatisfiedLinkError: Unable to load library 'gtk-3'
	at org.audiveris.omr.WellKnowns.getGdkMaxScale(WellKnowns.java:310)
	at org.audiveris.omr.WellKnowns.enableHiDpiScaling(WellKnowns.java:295)
	at org.audiveris.omr.WellKnowns.<clinit>(WellKnowns.java:211)
	at org.audiveris.omr.Main.<clinit>(Main.java:70)
	at Audiveris.main(Audiveris.java:50)
```

The `.deb`'s `Depends` is `libasound2, libbsd0, libc6, libmd0, libx11-6, libxau6, libxcb1,
libxdmcp6, libxext6, libxi6, libxrender1, libxtst6, xdg-utils, zlib1g` — no gtk-3. Because the
load happens in a static initialiser reached from `Main`'s own static initialiser, it runs before
any argument is parsed, so `-batch` does not avoid it.

**An image built from the previous Dockerfile would have failed every conversion in production
while passing every static check in this repository.**

## Commands and results

| Command | Result | Evidence |
|---|---|---|
| `dnf install -y podman git` | PASS | podman 4.4.1, git 2.39.3 |
| `podman build -f Dockerfile.audiveris` (before fix) | FAIL | `dpkg --configure` exit 3; `/var/log/omr-build.log` |
| `sha256sum -c` on the pinned `.deb` | PASS | `/tmp/Audiveris-5.11.0-ubuntu22.04-x86_64.deb: OK` — PR #36's pin `ae714594f4…` is correct |
| `podman build -f Dockerfile.audiveris` (after fix) | PASS | `Successfully tagged localhost/clairkeys-omr:5.11.0`, image `4fbbffe29c3`, 911 MB; `/var/log/omr-build2.log` |
| In-build `Audiveris -version` | PASS | Audiveris 5.11.0, commit `9e1e55cd2746037d059345881c53e6a6754bffbd`, OpenJDK 25.0.3+9-LTS, Tesseract OCR 5.5.2 |
| `grep -Fqx 'java-options=-Xmx3G'` | PASS | heap rewrite still applies |
| Real PDF → `.mxl` (Bach WTK1 Prelude 1, Mutopia, 2 pages, 76K) | PASS | `Score wtk1-prelude1-a4 exported to /output/wtk1-prelude1-a4.mxl` (9316 bytes); `/var/log/omr-convert.log` |
| `.mxl` → animation JSON via `python3 -m omr.cli` | PASS | exit 0, 52639 bytes, 514 notes, `duration` 73.875, `tempo` 120, keys `version/title/composer/metadata/notes/duration/tempo/keySignature/timeSignature/generated_at` |
| `python3 -m unittest tests.test_audiveris_runtime` | PASS | 11 tests, including two new regressions |

Exactly one `.mxl` was produced, so `audiveris.py`'s multiple-output rejection was not exercised.
The `.omr` book file (508909 bytes) and a `.log` also land in the output folder; neither matches
the `*.mxl` / `*.xml` globs.

## Regression evidence added

`omr-service/tests/test_audiveris_runtime.py` gains two tests that fail against the previous
Dockerfile:

- `test_container_supplies_the_needs_the_deb_does_not_declare` — pins `desktop-file-utils`,
  `shared-mime-info`, `/usr/share/applications`, and `libgtk-3-0`.
- `test_build_proves_the_launcher_starts_not_merely_that_it_exists` — pins that the build invokes
  `/opt/audiveris/bin/Audiveris -version`, so a missing runtime dependency fails the build rather
  than a user's upload.

## Gaps and risks

- **Recognition accuracy is unmeasured.** The output is structurally valid and its opening matches
  the prelude's arpeggio (MIDI 60 bass against 67/72 above), but there is no note at 0.125s
  between the notes at 0.0 and 0.25, which is where a sixteenth belongs. This PDF has no ground
  truth in `fixtures/`, so `compareAnimationData` cannot score it. Do not report accuracy from
  this record.
- **`e2e/fixtures/sample-sheet.pdf` is not usable as an OMR fixture.** It is a 468-byte synthetic
  PDF that draws text, not an engraved score.
- **The FastAPI service has not been run.** Only Audiveris and `omr.cli` were exercised directly.
  Supabase upload, `/process`, and `/status/{job_id}` are untested here, and no Supabase
  credentials are configured on the VM.
- **Nothing is deployed or exposed.** No systemd unit, no nginx, no TLS, no authentication, no
  `OMR_SERVICE_URL` change on Vercel. Ports 80/443/3000 are open at the NCloud ACG but nothing
  listens on them.
- **podman ignores the Dockerfile's `HEALTHCHECK`**: `HEALTHCHECK is not supported for OCI image
  format and will be ignored. Must use 'docker' format.` Liveness must come from systemd or nginx
  unless the image is built with `--format docker`.
- **`app.py` hardcodes `/data/processing/{job_id}`.** The host directory must be mounted or the
  container's writable layer will fill the disk.
- **No OS-level defence in depth.** SELinux is `Disabled` and firewalld is `inactive`, so the
  NCloud ACG is the only control. `rpcbind` listens on `0.0.0.0:111` with no need for it.
- **`fly.toml` is still the deployment contract in CI.**
  `test_fly_memory_and_bundled_launcher_heap_leave_headroom` asserts `memory = "4gb"` from that
  file, so removing it breaks the suite. Replacing it needs a D-008 revision plus a new contract
  test, which is a code change and therefore a PR.
- **Memory sizing is now conservative rather than tuned.** The `-Xmx3G` / 4GB pairing was chosen
  for a Fly VM; this host has 15Gi. It was deliberately left unchanged so this record proves the
  shipped contract, not a variant of it.
- **The machine is scheduled to expire about one month from 2026-08-20** and may be recreated with
  a different IP. Provisioning should be captured as a re-runnable script rather than typed by
  hand.
