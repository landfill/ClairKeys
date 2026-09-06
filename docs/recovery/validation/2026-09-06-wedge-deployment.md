# PR145 VM production deployment

Date: 2026-09-06 KST

User explicitly instructed `vm 도 그럼 배포해` after PR145 merge and clarification that Vercel
Production was already deployed but the separate OMR VM still ran PR144. This authorizes the OMR
image build, validation, service cutover and deployment checks; no additional approval is pending.

Target exact merge: `1edbceacdd13ef7947d7cf0a3dcc22bcc88b1c81`. All six merge-commit checks passed.
Preflight: clean /opt/clairkeys-deploy at b9d3ac6, service active/running, current image
`d7d6344bbc1331324b8b14e7a62a4de6a3f5d22a62e908503773edfeac106c8a`. Only the pre-existing
historical processing directory8e33ffee-70a3-45da-a809-6b52745be42d exists and is preserved.

Detached deployment checkout at the exact merge and started:
`cd /opt/clairkeys-deploy/omr-service && podman build --format docker -f Dockerfile.audiveris -t localhost/clairkeys-omr:1edbcea .`
Current production tag remains unchanged during build; b9d3ac6 is retained for rollback. The unit
has no diff between b9d3ac6 and1edbcea. No credential, environment or stored-score changes.

Build and image-internal validation are in progress. Live smoke will use the existing authenticated
API helper without user/sheet/callback fields and compare every animation note and duration against
the independently validated native result:431 notes,123.0 seconds. This is a source-specific recovery
check, not a claim that all remaining musical accuracy issues are solved.


## Image validation and approved cutover

Build exit0, target image `1a28f10ea2bb5fb6f4a038008c5b89ec0556ab8049fcac002009c2e1dcf24173`.
Docker HEALTHCHECK is present. Initial image test invocation ran149 tests with one error and six
skips: a static patch test expected /omr-service/audiveris-patches while the image installs at /app.
No production code failure was hidden. A disposable test container linked /omr-service to its own
/app (no code overlay), with only fixtures/src mounted read-only; all143 runnable tests then passed
in1.001s, with six explicitly skipped private-source diagnostic tests already covered locally.
Logs: local-test-data/results/wedge-deploy-2026-09-06/image-tests*.log.

Before cutover, current image and new tag were checked by exact ID, the installed unit matched the
committed unit, only the historical processing directory existed and the production container had
only its Python process. Retained the old image as rollback-pr145 and b9d3ac6, tagged the tested new
image as current, and restarted clairkeys-omr.service. Restart exited0; systemd active and actual
running image matched1a28f10e…24173. Manual healthcheck succeeded and reports healthy.
External health returned200 and unauthenticated process returned401. No env/secret/unit changes.

Running image code hashes:
- audiveris.py:3a72a241f348734693b022d3836a1a6646b72d0fd9ea40c7684844f521200e96
- wedge_retry.py:c3b62f2365b2cc004f1ec16b239945499ddfd7a0f7682f060b950ed2b4e012b0
- converter.py:aec8c22b3ced151a10c3d1c00fe6c96f95a49ac8ee98d6354d632469eea10387

## Live API check underway

Approved same Love PDF hash acdd4ee03f8da75493491f677519dbce4fecf0275b106caf268fa6899ea34253
staged at /data/analysis/pr145-live-s2WCQD. Existing API helper runs inside the actual production
container with no code overlay, accessing the service credential only internally. Request has no
user/sheet/callback IDs. POST/process returned200, job f283fcff-f388-4187-8069-cac69dbc789a.
The helper emits a non-failing RequestsDependencyWarning for installed dependency versions;
authenticated upload succeeded. Final result/equality and staging cleanup remain in progress.


## Live result, equality and cleanup complete

Live job f283fcff-f388-4187-8069-cac69dbc789a completed in150.842s. Early result409 became200;
147 status polls, maximum latency2128.682ms, no animation embedded in status. Actual deployed API
returned431 notes,123.0 seconds,4/4,keyE, reference BPM60, score tempo unknown, and no timing warnings.

Root converted the independently validated final native MXL with the same merged converter and
compared the live JSON: every note dictionary and duration match exactly. The sole top-level
change is generated_at. This confirms the deployed recovery, not merely an isolated test image.
Expected/actual/comparison records are under local-test-data/results/wedge-deploy-2026-09-06/.
Actual animation SHA256:61e987656a17e935ab3c192547a980395b5faaae8813342beba290b83bf8c439.
All seven returned JSON files were collected and their local SHA256 values matched the remote files.

Service removed the per-job processing directory automatically. Root removed the complete dedicated
/data/analysis/pr145-live-s2WCQD staging tree after collection and verified absence. Only the
pre-existing historical processing directory remains. Deployment checkout is clean; running/current
image is1a28f10e…24173 and healthy; rollback-pr145 still points to d7d6344b…106c8a. No credential,
unit, stored-score or library changes were made. Existing stored animations are not automatically
reprocessed; a new upload uses this deployed recognition path.

The explicit VM deployment request is fulfilled. Vercel web Production was already automatically
deployed; the separate OMR production VM now also runs PR145. Wedge phase delivery is complete;
unknown numeric tempo, RH tie defects and broader musical accuracy remain outside this fix.
