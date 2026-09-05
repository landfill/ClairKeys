# 2026-09-05 — remaining GitHub issues versus current implementation

Application baseline: `34db5d1` (latest application change remains merge `a7cf0ff`).
Fetched origin; local main was current. Existing `.claude/settings.local.json` change was preserved.
Read all 12 initially open issue bodies and comments, and inspected the recently closed #134.

## Conclusion

No initially open issue is demonstrably complete across its full body/acceptance criteria. Several titles
or unchecked prerequisites are stale because portions already shipped. Narrowing or splitting those issues
would improve the tracker; closing the whole issue would conceal remaining work.

| Issue | Already delivered | Still required / recommendation |
| --- | --- | --- |
| [#47](https://github.com/landfill/ClairKeys/issues/47) error stack traces | Canonical upload UI does not render server error/message strings. `OMRProcessingStatus` uses local failure descriptions; regression feeds a Java stack trace and asserts it never appears. This shipped in DS-3 / PR #91, not in the latest timing PRs. | Detailed cause classification from `No regularly spaced lines`, low interline and export failure is absent; all conversion failures use one generic description, and service status still carries raw errors. Split the completed UI exposure symptom from remaining server classification/sanitization, or retitle the issue. |
| [#126](https://github.com/landfill/ClairKeys/issues/126) fingering cost | Tier 2 shipped in PR #129/D-041: anchor, crossings, fast-repeat behavior, black-key constraints; the CAGED post-pass is gone. Current version is phrase-dp-v3. | Boundary still drops voice/staff and does not pass key/time context into inference. Tier 3 notation/phrase contract remains absent. The phase is DONE, the umbrella issue is not. Remove obsolete v1/current-logic text and retain remaining tiers. |
| [#130](https://github.com/landfill/ClairKeys/issues/130) reach and arpeggio | Real 411-note corpus, pairwise chord reach constraint, and metric-validity harness shipped (#131/#132/#133/#136). Corpus unreachable chord pairs are 0/154. #140 additionally resolves held-note display conflicts on the different Gymnopédie corpus. | Wide-arpeggio musical reference and leap-exception scope remain unresolved (D-045). Body still contains disqualified wastedHandTravel goals and old 43/167,13/167 figures; the later comment is more current. Do not conflate #135's occupancy fix with this arpeggio problem. |
| [#127](https://github.com/landfill/ClairKeys/issues/127) MusicXML retention | D-040 already records PDF-only prohibition, permission for justified MusicXML/JSON retention, existing-score re-registration and keeping storage credentials off the VM. PR #141 adds a real retained MXL corpus and exact musical-output comparison. | General service retention/lifecycle/access/expiry remains undecided and unimplemented. `app.py` still removes job directories on success/failure and `/result` returns JSON only. Manual diagnostic fixtures do not implement automatic retention. Update the obsolete claims that policy is unrecorded and no real XML corpus exists. |
| [#121](https://github.com/landfill/ClairKeys/issues/121) operational observability | Deployment SHA/image IDs, rollback/runbook evidence, external health=200/auth=401 checks and Docker-format HEALTHCHECK verified. Converter now produces per-score rhythm warnings. | Periodic external monitoring, resource/queue/callback metrics, dashboards, alerts, routing/retention and alert-drill verification are not implemented. Snapshot checks and local health do not satisfy the observability contract. |
| [#44](https://github.com/landfill/ClairKeys/issues/44) Bach rhythm | Generic converter in-measure tempo/offset handling and overfull-measure diagnostics now exist. | The specific Bach input's original→XML→result→served lineage and musically corrected output have not been established. The #134 same-input reproduction is a different score. Keep open. |
| [#125](https://github.com/landfill/ClairKeys/issues/125) score panel/layout | D-040 satisfies the policy/re-registration documentation prerequisite. | Geometry remains falling/keyboard only, with minimum keyboard height 120 and aspect 6.3; no notation pane or full notation data contract. Both A/B remain. Correct stale policy text, not issue status. |
| [#124](https://github.com/landfill/ClairKeys/issues/124) finger badge overflow | #140 removes finger badges from sustaining tails only. | Active-note badge minimum remains 14px, font minimum 12px and no short-note clamp/size-based visibility. The reported badge geometry defect is still present. |
| [#73](https://github.com/landfill/ClairKeys/issues/73) callback failure testing | Retry policy and callback placement/timeout relationship have tests. | Actual notify_completion HTTP loop still lacks behavioral MockTransport coverage; real-job exhaustion/fallback observation remains absent. The 46 passing VM service tests include AST checks and must not be misreported as HTTP loop coverage. |
| [#110](https://github.com/landfill/ClairKeys/issues/110) callback destination validation | Next.js callback origin setup validation was already handled separately by #109. | Python notify_completion still posts to the supplied callback_url with the shared token without a scheme/origin allowlist. No change from the latest PRs. |
| [#61](https://github.com/landfill/ClairKeys/issues/61) per-sample volume residuals | Global sample/master gain work exists. | Playback still applies the same SAMPLE_PEAK_GAIN across samples; no per-sample residual compensation or replacement decision. Keep open. |
| [#46](https://github.com/landfill/ClairKeys/issues/46) undersized PDF rendering | UI provides a generic clearer-PDF recovery action. | Audiveris command still has no adaptive pdfResolution, page-size scaling or low-interline retry. Better error wording does not fix rendering. Keep open. |

## Incorrect closure discovered and corrected

[#134](https://github.com/landfill/ClairKeys/issues/134) was CLOSED at the beginning of this check, despite
the handoff and validation explicitly saying its recognition error was unresolved.

- PR #141's body included the phrase `or close #134 as musically corrected` inside a negative sentence.
- GitHub reported #134 in that PR's `closingIssuesReferences` and its close event followed the merge at
  2026-09-05T11:39:41Z. The assistant's wording caused the unintended automatic closure.
- Corrected the assistant-authored PR body to describe the unresolved work without a closing keyword,
  and reopened only #134 to restore the intended state. Verified `state=OPEN`, `closedAt=null`.
- There are now **13 open issues**. No other issue was closed, retitled, or had its body/comments changed.
  No application code changed in this audit.

## Evidence and focused verification

- `src/components/upload/OMRProcessingStatus.tsx:133`, `src/lib/upload/uploadFailures.ts` and the stack-trace regression.
- `src/utils/fingeringUtils.ts`, `src/utils/dataConverter.ts:98`, `handReach.ts`, fingering corpus/validity tests and D-041–D-047.
- D-040; `app.py:373,387`; retained actual MXL in `fixtures/musicxml-timing/clair-de-lune-recognition.json`.
- `playbackGeometry.ts`, `visualUtils.ts:130`, `FallingNotes.tsx`, `app.py:240`, `test_service_contract.py` and `pianoSamples.ts`.
- Live GitHub issue bodies/comments, timeline and PR #141 closing references were read on 2026-09-05.

Executed:

```text
npm test -- --runInBand --silent src/components/upload/__tests__/OMRProcessingStatus.test.tsx src/lib/upload/__tests__/uploadFailures.test.ts src/utils/__tests__/fingeringUtils.test.ts src/utils/__tests__/fingeringCorpus.test.ts src/utils/__tests__/heldNoteGuidance.test.ts src/utils/__tests__/musicxmlTiming.test.ts src/components/playback/__tests__/ScoreTimingNotice.test.tsx
7 suites / 119 tests PASS
```

No full build/type/lint rerun or new VM mutation was needed for this status audit. Prior code/VM deployment
checks remain documented in the corresponding phase records. The only tracker mutation corrected the
assistant's own unintended #134 closure; recommendations for the other issues are not tracker edits.
