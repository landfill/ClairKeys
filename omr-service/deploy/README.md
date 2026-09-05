# Deploying the OMR service on the allocated VM

Applied 2026-08-23 to `vm-naver-20260820145930` (Rocky Linux 8.8, podman 4.4.1).
For a fresh OS-only VM allocated by 모두의AI, follow
[`docs/vm-replacement.md`](../../docs/vm-replacement.md) first. That is the canonical guide for
validating the new PEM and host fingerprint, requesting network access, bootstrapping the OS,
cutting over Vercel, rolling back, and returning the old VM. This file explains the service-specific
layout and repeat deployment on an already prepared host.
The decision behind the shape of this — plain HTTP without TLS, and why that is
acceptable *for now and not later* — is **D-012** in `docs/recovery/DECISIONS.md`.
Read it before changing anything here.

## What runs

```text
Vercel ──HTTP──> <VM_PUBLIC_IP>:3000 ──> container :8000
```

- **No TLS.** Test phase only; D-012 records what that accepts and the condition
  for ending it.
- **No storage credentials on this host** (D-011). The service converts and hands
  the JSON back through `GET /result/{job_id}`; Vercel stores it.
- Port **3000** rather than 8000 or 80: provider network access is requested through 모두의AI, and
  80/443 are deliberately left free so TLS can be added in front later without touching the
  container.

## Files

| Path | Purpose | Mode |
|---|---|---|
| `/etc/systemd/system/clairkeys-omr.service` | Unit; a copy is committed here as `clairkeys-omr.service` | 644 |
| `/etc/clairkeys-omr.env` | `ENVIRONMENT`, `OMR_SHARED_SECRET`, `AUDIVERIS_MAX_CONCURRENCY` | **600** |
| `/data` | Bind-mounted to the container's `/data` | — |

**The secret lives in the env file, not the unit.** `podman generate systemd
--new` embeds the full `podman run` command in the unit, which is world-readable
at 644 — passing `-e OMR_SHARED_SECRET=…` would publish it to every local user.
`--env-file` keeps it in a 600 file and the unit only names the path.

## From nothing to running

```bash
# 1. A worktree at the commit being deployed, so the running image maps to a
#    merged commit rather than to whatever the clone happened to contain.
git -C /opt/clairkeys fetch origin main
git -C /opt/clairkeys worktree add --detach /opt/clairkeys-deploy origin/main

# 2. Build, tagged both by commit and as :current, which the unit references.
cd /opt/clairkeys-deploy/omr-service
podman build --format docker -f Dockerfile.audiveris \
  -t "clairkeys-omr:$(git -C /opt/clairkeys rev-parse --short origin/main)" \
  -t clairkeys-omr:current .

# 3. The secret, into a file only root can read.
umask 077
{
  echo "ENVIRONMENT=production"
  echo "OMR_SHARED_SECRET=$(openssl rand -hex 32)"
  echo "AUDIVERIS_MAX_CONCURRENCY=1"
} > /etc/clairkeys-omr.env
chmod 600 /etc/clairkeys-omr.env

# 4. Install the unit and start it.
cp clairkeys-omr.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now clairkeys-omr
```

`AUDIVERIS_MAX_CONCURRENCY=1` is load-bearing: one Audiveris JVM is configured
for 3 GB and the VM has 15 GiB, but concurrency was pinned at 1 when the box was
provisioned at 4 GB (PR #36) and nothing has re-measured it since.

## Repeat deployment

Use the already prepared `/opt/clairkeys-deploy` checkout for subsequent image
updates; do not build from a checkout with uncommitted files. Replace `<commit>`
with the exact commit being deployed.

```bash
git -C /opt/clairkeys-deploy fetch origin main
test -z "$(git -C /opt/clairkeys-deploy status --porcelain)"
git -C /opt/clairkeys-deploy checkout --detach <commit>
cd /opt/clairkeys-deploy/omr-service
podman build --format docker -f Dockerfile.audiveris \
  -t "clairkeys-omr:<commit>" -t clairkeys-omr:current .
expected_image=$(podman image inspect --format '{{.Id}}' "clairkeys-omr:<commit>")
install -m 0644 deploy/clairkeys-omr.service /etc/systemd/system/clairkeys-omr.service
systemctl daemon-reload
systemctl restart clairkeys-omr
test "$(systemctl is-active clairkeys-omr)" = active
actual_image=$(podman inspect --format '{{.Image}}' clairkeys-omr-prod)
test "$actual_image" = "$expected_image"
```

The `restart` command must exit 0. The final two checks must show an active
service and a running container; compare the container image ID with the ID
printed by `podman image inspect` to prove that the new image is running rather
than an older container. If restart fails, stop and inspect the journal before
retrying instead of relying on `Restart=always` to hide a transient failure:

Keep `--format docker`: podman 4.4.1's default OCI format warns that it ignores
the Dockerfile's `HEALTHCHECK`. Confirm the built image retains that check and
still run the external HTTP probes below; image metadata alone is not evidence
that the provider network or the shared-secret boundary works.

```bash
journalctl -u clairkeys-omr --since "5 minutes ago" --no-pager
systemctl status clairkeys-omr --no-pager
```

After a successful restart, repeat the external `/health` and unauthorized
`/process` checks below. The unit removes a stale cidfile before each start, so
the restart result is now a meaningful deployment signal.

## Confirming it actually works

From **outside** the VM, which is the only vantage point that proves anything —
`127.0.0.1` says nothing about whether the provider network lets Vercel in:

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://<VM_PUBLIC_IP>:3000/health   # 200
curl -s -o /dev/null -w '%{http_code}\n' -X POST \
     http://<VM_PUBLIC_IP>:3000/process                                      # 401
```

`200` then `401` is the pair that matters: the service is reachable **and** the
shared secret gate is on. A `401` on `/health` would mean the secret is
misconfigured; a timeout on both means the allocated address or provider network policy is wrong.

A full conversion, with the secret:

```bash
SECRET=$(grep '^OMR_SHARED_SECRET=' /etc/clairkeys-omr.env | cut -d= -f2)
curl -s -X POST http://<VM_PUBLIC_IP>:3000/process \
  -H "X-ClairKeys-Token: $SECRET" \
  -F "file=@/data/testpdf/wtk1-prelude1-a4.pdf" \
  -F "title=…" -F "composer=…" -F "user_id=…" -F "sheet_music_id=…"
# then GET /status/{job_id}, then GET /result/{job_id}
```

The Bach WTK1 Prelude 1 fixture converts to **514 notes** and a ~45 KB payload.
That count has been stable across every run since 2026-08-21, so a different
number means the converter changed, not the deployment.

## The two Vercel variables

They must be set **together**. `omrAuthHeaders()` returns `{}` when
`OMR_SHARED_SECRET` is absent, so a correct `OMR_SERVICE_URL` with no secret
sends unauthenticated requests and every call answers 401 — which reads like a
service fault rather than a missing variable.

```
OMR_SERVICE_URL    = http://<VM_PUBLIC_IP>:3000
OMR_SHARED_SECRET  = <the exact value in /etc/clairkeys-omr.env>
```

## Rotating the secret

Both sides change or nothing works, and the service is the side that rejects:

1. `openssl rand -hex 32`, rewrite `/etc/clairkeys-omr.env`, keep mode 600.
2. Update `OMR_SHARED_SECRET` in Vercel to the same value.
3. `systemctl restart clairkeys-omr`.

Restarting drops in-flight jobs — job state is in process memory (D-011). Rows
mid-conversion are failed by the status route's 404 branch (PR #41) rather than
being stranded, but they are still lost work, so rotate when nothing is running.

## Adding TLS later

The exit condition in D-012. Nothing here has to move:

- `<VM_PUBLIC_IP>.sslip.io` resolves to the host with no registration (replace the placeholder
  with the dotted IPv4 address).
- Ask 모두의AI to open ports 80 and 443 for the TLS cutover; bind nothing else to them.
- nginx terminates TLS and proxies to `127.0.0.1:3000`; the container's published
  port becomes `127.0.0.1:3000` instead of `0.0.0.0:3000`, a one-line unit edit.
- Only `OMR_SERVICE_URL` changes on Vercel. No application code changes.

While configuring nginx, do not proxy `GET /` — it answers 200 without a token
(found 2026-08-23) and only announces the service. `/health` must stay open for
health checks.
