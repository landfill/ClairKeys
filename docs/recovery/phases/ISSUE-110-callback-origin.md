# ISSUE-110 — Completion Callback Origin Boundary

Status: `DONE`

## Objective

Prevent the OMR service from attaching its shared secret to any completion callback outside the
single configured ClairKeys origin, without changing conversion completion, result retention, or
the existing delivery retry contract.

## In scope

- stdlib-only callback URL and configured-origin validation
- exact scheme, hostname, and effective-port matching
- HTTPS in production and HTTP only when `ENVIRONMENT=development` is explicit
- fail-closed missing or invalid `CLAIRKEYS_CALLBACK_ORIGIN`
- runtime proof that rejection sends zero requests and leaves the completed result available
- redirect suppression and secret-safe callback logging
- Jest/CI execution bridge for the Python runtime regression
- deployment configuration, verification, upgrade-impact, and rollback instructions

## Out of scope

- VM configuration, image build, rollout, or production-token use
- durable delivery storage or restart recovery (P1-B)
- unrelated #73 transport expansion
- Next.js callback construction already governed by D-036

## Work stages

1. Add executable policy and `notify_completion` runtime regressions that fail on the current code.
2. Record the destination-validation policy in D-057.
3. Implement the stdlib boundary and enforce it before creating an HTTP client.
4. Connect the Python suite to Jest and the OMR path filter to required PR CI.
5. Document deployment preparation, verify locally with fake destinations and secrets, and prepare a
   review-ready PR.

## Completion criteria

- Missing/invalid configuration and userinfo, malformed, suffix-host, wrong-port, fragment, and
  production-HTTP callback URLs are rejected before transport creation.
- An exact HTTPS origin is accepted; explicit development may use an exact HTTP origin.
- Redirects are not followed, rejected delivery records `failed`, and completed conversion state and
  result data remain intact.
- Existing retry/backoff/status/timeout behavior remains covered.
- Logs do not contain the callback URL, its query/token, response body, or shared secret.
- Focused Python, Jest bridge, required Jest/type/lint/build checks pass.
- Review-ready code and deployment-preparation documentation exist; actual VM rollout and live normal/
  rejection verification remain explicitly pending and issue #110 remains open.

## Progress

- 2026-09-12: PR151 explicitly approved and merged as381a17f. Code/tests/deployment preparation
  are in main. Post-merge checks are being verified; OMR VM rollout and live callback verification
  remain separate and unperformed. Issue110 stays open.

- 2026-09-12: All six exact-merge checks passed. This code/test/deployment-preparation phase is
  complete; the separately scoped OMR rollout/live verification remains outstanding in issue110.

- 2026-09-12: Separate user-approved VM rollout completed. Exact-image offline regression, canonical
  origin configuration, restart/health/auth and actual app callback delivered/storage/playback verified.
  See validation/2026-09-12-callback-vm-deployment.md. Issue110 remains administratively open.

- 2026-09-12: User-requested GitHub status synchronization completed. Issue110 body reflects actual
  deployment and verification, and the issue is CLOSED/COMPLETED. Readback verified.
