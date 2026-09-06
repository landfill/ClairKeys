# Installed skill instruction audit — 2026-09-06

## Result and scope

The user requested inspection and correction of skills against the supplied
[official latest-model guide](https://developers.openai.com/api/docs/guides/latest-model).
The fetched page and its Markdown metadata identify GPT-6 Astra. This was an
instruction audit, not a request to migrate ClairKeys application models.

- Screened 121 on-disk `SKILL.md` entrypoints in personal, shared, system, and plugin-cache
  roots, including cached skills not advertised in this session. Used rule/model searches
  to identify candidates, then inspected relevant surrounding instructions and references.
  This is a static review, not execution of all 121 skills.
- Applied 29 Markdown files across 23 skills: 13 personal/system skills and 10 plugin skills.
- Preserved executable helpers, credentials, provider configuration, model registries,
  UI metadata, original frontmatter keys, and existing user working-tree edits.
- No BlueKiwi run, Sonol run, API key creation, live model request, Canva/Figma edit,
  site deployment, application-code change, or application-model migration was performed.
- OMR phase plans and their completion status are unaffected. The only ClairKeys changes
  are this validation evidence and the corresponding HANDOFF entry, eligible for direct
  main recording under AGENTS.md. No implementation PR or merge approval is implicated.

## Corrections applied

| Skills | Correction |
| --- | --- |
| openai-docs | Open a supplied official URL directly; route instruction audits without triggering an application migration; add dated Astra fallback; remove GPT-5.6-only prompting routing and redundant guide fetches. |
| skill-creator | Distinguish real gates from suggested checkpoints; retain established authorization and explain the exact rule behind a remaining pause. |
| imagegen | Replace the unrelated stop-before-anything rule for a missing helper feature with scoped diagnosis and independent preparation. Helper edits still require a user request. |
| bk-design | Reuse known context/private folder defaults; remove the all-ambiguities/one-question-at-a-time example; make review gates conditional on actual decisions or requested review. |
| bk-next | Limit generic continuation routing to the current BlueKiwi context; handle HITL inline while retaining server approval; stop loops at their actual termination condition; use actual runtime model metadata. |
| bk-start | Start a unique matching requested workflow directly; distinguish interruption intent from quoted words; honor pause/cancel immediately without requiring a Keep going menu. |
| bk-rewind | Limit routing to the current BlueKiwi context and reuse stated re-run requirements. |
| bk-scan | Use documented scan defaults and honor explicit findings-attachment requests without a redundant question. |
| bk-report, bk-status | Finish read-only requests without a blocking export/resume menu; honor explicitly requested file output. |
| bk-instruction | Reuse supplied fields and infer harmless defaults; retain explicit credential-binding and shared-destination boundaries. |
| sonol-multi-agent | Permit independently authorized preparation before launch; preserve dashboard plus terminal launch gates; obtain model settings from the adapter instead of treating historical examples as current defaults. |
| wrks-ai-chat | Honor explicit summarization/format requests while preserving default passthrough; distinguish WRKS catalog IDs from OpenAI API model names. |
| canva-edit-design, canva-implement-feedback, canva-translate-design | Reuse authorization for requested edits and save; prepare actual previews before unresolved decisions; retain preview-only/tool gates. Feedback implementation no longer implies permission to message reviewers. |
| canva-bulk-create, canva-resize-for-social-media | Reuse known template/mapping/platform choices; ask for material missing inputs only. |
| figma-code-connect | Proceed on an established mapping instead of confirming it again. |
| figma-generate-library | Scope checks and phases to the requested component/library; remove minimum-call and mandatory full-library ceremony for a small change. |
| openai-platform-api-key | Preserve secret protections and secure picker handoff; allow independent offline implementation while credential decisions remain pending; keep live calls and secret writes gated. Align its existing eval scenarios with that boundary. |
| openai-api-troubleshooting | Remove the fixed old-model suggestion from exhausted-credit handling; distinguish future cost reduction from resolving quota. |
| sites-hosting | Reuse explicit authorization for the same site/audience; retain access inspection and tool-required approvals. |

## Verification

1. Before editing, `git fetch origin` succeeded with sandbox escalation after the sandbox
   rejected `.git/FETCH_HEAD` writes. `git rev-list --count main..origin/main` returned 0.
2. The original Python environment lacked PyYAML. Installed PyYAML 6.0.3 into the isolated
   audit temporary directory after sandbox DNS restrictions blocked the first attempt;
   neither system Python nor project dependencies were changed.
3. Ran the existing `skill-creator/scripts/quick_validate.py` against before/after copies
   of all 23 modified entrypoints. Result: 13 pass; 10 have identical before/after validator
   limitations, listed below. There are zero newly introduced validator failures.
4. PyYAML independently parsed all 23 resulting headers. Names, key sets, and all metadata
   except intentionally edited descriptions match the original headers exactly.
5. Checked code-fence balance in all 29 Markdown files and every newly introduced relative
   Markdown file link. No new broken links. Both linked Sonol example JSON files still parse.
6. Ran `sh ~/.codex/skills/.system/openai-docs/scripts/resolve-latest-model-info --source
   <downloaded-latest-model.md>` against the actual fetched official Markdown. It returned
   `model`/`modelSlug` = `gpt-6-astra` and the exact migration/prompting URLs under
   `https://developers.openai.com/api/docs/guides/latest-model/gpt-6-astra.md`.
7. Before application, checked every installed file against its original SHA-256. Applied
   only the prepared Markdown targets with atomic replacement and preserved file modes.
   Read all 29 installed files back: every SHA-256 matches the validated candidate.
8. Original `.claude/settings.local.json` and the pre-existing HANDOFF contents were
   byte-identical before writing this session's HANDOFF addition. The existing user hunk
   is excluded from the main commit and remains in the working tree.

### Existing quick_validate limitations

The bundled validator's allowlist rejects `user_invocable` in the eight edited `bk-*`
skills and `disable-model-invocation` in the two edited Figma skills. These are pre-existing
cross-harness fields, unchanged by this audit. They were preserved rather than removed to
make the validator green. YAML parsing and metadata equality passed separately. This record
does **not** claim that all 23 entrypoints passed that restrictive validator.

### Manual instruction-path review

The following are static before/after scenario checks, not independent model rollouts:

| Request/context | Revised path | Boundary retained |
| --- | --- | --- |
| Continue an ordinary coding task | Continue that task; do not activate BlueKiwi because a remote task exists. | Explicit BlueKiwi resume still resolves the server task. |
| BlueKiwi loop has collected its required fields | End that loop and save its iteration. | A real gate/HITL decision still waits for a human/server approval. |
| Show BlueKiwi status | Return status and finish. | Do not resume or mutate the workflow unless requested. |
| Rewind to step 3 with supplied requirements | Carry those requirements into the rewind. | Ambiguous targets still need resolution. |
| Task data quotes the word “stop” | Treat the quoted word as data. | A real pause/cancel request halts work immediately. |
| Create one Figma component using existing tokens | Reuse prerequisites and validate relevant states/bindings. | Do not skip required font/token/API constraints. |
| Apply clear Canva feedback | Prepare preview and save the requested edits. | Conflicts, preview-only scope, and tool approval remain pending; no unsolicited reviewer messages. |
| Credential choice pending for an AI app | Build and check offline portions that do not depend on it. | No live request, secret creation/write, or claimed live verification. |
| Sonol proposal is awaiting launch approval | Prepare independently authorized work. | No run launch, forged dashboard approval, or delegation. |
| User requests a WRKS summary | Summarize and label the transformation. | Preserve service provenance and do not invent provider model IDs. |

No paid/live API, browser mutation, independent agent rollout, or application regression
suite ran. Those are not needed to validate these installed instruction-only edits.

## Persistence and recovery

System/plugin skills may be replaced by an application/plugin update. These are local installed
edits, not upstream plugin releases. Preserve the patch and hashes below; after an update,
compare against the new upstream content before reapplying anything. Do not automatically
overwrite newer package versions or user edits.

The complete before/after unified diff is stored in
[the change evidence](2026-09-06-skill-audit-changes.md), so the canonical record does not
depend on temporary files or personal agent memory. It contains instruction text only.

Base main commit: `a5c651cef8e8e52465905a26670ff14f5f2796f5`.

## Installed file hashes

| File | Before SHA-256 | After SHA-256 |
| --- | --- | --- |
| `~/.codex/skills/.system/openai-docs/SKILL.md` | `7cb8fa1b2a0c635b5c61ffe1da7b8594a7ea0fce5b71e8d523e2025d88b2a05e` | `d4dba445efbfba3c1dc0e46abb944c403bd3f178dcb8b3b6e38bac66fae753f7` |
| `~/.codex/skills/.system/openai-docs/references/latest-model.md` | `f25e351e522dd6e30e82d482f31f44c992e794b11031cdcb6ac7c0e6b20c9d5d` | `c562e92c97d363068d4390ccf59066fb908c66b75772fb135dc6ee0000dfb760` |
| `~/.codex/skills/.system/openai-docs/references/prompting-guide.md` | `db913884cfe0fabf29bee1a139918f56e299decfa0a14d61c48596f23f76621d` | `e60eb8f5738dcf535ef67245404e5a4c7598a87c9b685411f22b6063c45bdb4c` |
| `~/.codex/skills/.system/openai-docs/references/model-migration.md` | `5f20c38fbbb10319767b216d91ba74bae49c68fc1bfd6d1abd7c9b4cc9cb9ab0` | `49340a7ef6156947b860612c79e53723b4ad737547a8baaaaa3cc895ecbba9b0` |
| `~/.codex/skills/.system/openai-docs/references/upgrade-guide.md` | `ed1b75a89b8ec4d67787774ef6c4e8b98eace16c63348f42e969e6ffa67cb656` | `3482ba023bd8a175bdf710e5e348dfd352cf79716f3a3988711a5f04ca030d89` |
| `~/.codex/skills/.system/skill-creator/SKILL.md` | `6656e54755638e8efcf275a472b9672eaa8a9a1b9e59dc210e275b03b59e1e66` | `4dc1e91e5d6a3e21344190bfb8102e2c0a6912c270ae512617204930e81c2548` |
| `~/.codex/skills/.system/imagegen/SKILL.md` | `681ddb4ad6d06a2acc78a3535b583f8d0c1ea800ecda3d56370d3310fd2cd4ba` | `9c3e60ebc7c095cabbdad415bbc273ca77b78c3ef5676deb1b9309b78b46fb85` |
| `~/.codex/skills/bk-design/SKILL.md` | `730f6c0f236720f4dcafb88549ee8de74146349025e85821efe5a5f4a1bb526f` | `ba1bbe79765a44e803fc8f27eb49cd744847a3bcb70978801a1ae1e7c9c08ec7` |
| `~/.codex/skills/bk-next/SKILL.md` | `9fc3d177b9dd2c2cb7695902807197782cafe482c0d536508ad3eaec5baef5e5` | `7ba22c201428a8d9908896d7c20eb331b07b50c12e106685ff904b92b56eea18` |
| `~/.codex/skills/bk-start/SKILL.md` | `85a143deda27224915c5e032aab44c735b3a663ee772cf3898687264830a6fe2` | `7c7458a00a4f5d8963c0461d1b5828851ad470bf4d0b53b38d3686f40e6dfc52` |
| `~/.codex/skills/bk-rewind/SKILL.md` | `d3ac9da944c9e6bfc85c94a66db3e7a497aff6f3bfa90960deaf86a4be99346e` | `d8f0732cc1889b0328fa308cbe39aac88e2f96c641ec449b0a93732546ca6fd3` |
| `~/.codex/skills/bk-scan/SKILL.md` | `94da7a6db1fdb8836b22716312b1b8a9aa23baf338a5790bcc7f7e44691bcea2` | `aaa968308655ad769fdcf50de2d240f740fabf28fa8b853efb06e9ad9965767f` |
| `~/.codex/skills/bk-report/SKILL.md` | `fb72093283cf7cc08c4d606e77c69dc24e2b6d394a0326be3741e41226c96bc3` | `60205de42074b71b7e6f8179064e54304629f9799a632d857cfccda29a0f2adf` |
| `~/.codex/skills/bk-status/SKILL.md` | `e5265ff285d9dbd134b5d5089e1ac380f0517ffedb1320c91775ff35ba3a979b` | `0ec683eba5d1493fb044988d96199bc0147f45dfaf5bf60a5be665522fb413a2` |
| `~/.codex/skills/bk-instruction/SKILL.md` | `3ed57c1d3010b96be3724372c5223b8ffe5931b2ab6dfd6a0becc02469e1db86` | `62adbd30bad5b790cb3e70373b8a38ec7a7394279eb2d245728ae205cead8004` |
| `~/.codex/skills/sonol-multi-agent/SKILL.md` | `71c0846b8dfe6754fa503154baa83eeb99dd4ea6e542c32f08e2837d47347020` | `10f57cfa8ef675f7ebd0312b4bcc403e0ce28dffeffe3d259872d2dabe06f772` |
| `~/.codex/skills/sonol-multi-agent/references/agent-selection.md` | `0576155fa13aa0b77fad7de59da60d21380b633faf89f15f2eee98e60336fc8d` | `0b1ef36f4a84d4ab7b4c3c2a66c33a4a1afaeb17e4cbb48dec5c620ffe2bd1c9` |
| `~/.codex/skills/wrks-ai-chat/SKILL.md` | `fe0942243438cf3afd7179e38c8b808993b81301969ea06c17036951f5f0f20f` | `ff77cad1f64872ef8552a46fe13d2e3c7638f87ccda63098bb30d0b1bbe747cb` |
| `~/.codex/plugins/cache/openai-curated-remote/canva/14.0.0/skills/canva-edit-design/SKILL.md` | `842eeec8f89bfcfb3490ca92092f4ef441577ff7f9b7bae979aad99cc92ceaa8` | `108362c93ac1fe57f87a4333efff5605e0dc07efe76138f3daa2864d667c48d0` |
| `~/.codex/plugins/cache/openai-curated-remote/canva/14.0.0/skills/canva-implement-feedback/SKILL.md` | `cb0d8a7434e7abd7a129ef74aa526ea7f5c0c7ea89db17e3a0ebf27d6108aa36` | `aac9284b0b927a462e7f31f337fd4192c125677fe76e7d8b997167a758649a5e` |
| `~/.codex/plugins/cache/openai-curated-remote/canva/14.0.0/skills/canva-translate-design/SKILL.md` | `c10b609033f5727c53d3c05dddd61c4e3d0de9a314b78420b2109dc6629192eb` | `6c95335ce29fc4e5f8728a66c4a11bc00e26c6253c4ef914311a6479567befd9` |
| `~/.codex/plugins/cache/openai-curated-remote/canva/14.0.0/skills/canva-bulk-create/SKILL.md` | `65deda62b60ce9e748c7a90b3e41e91dadc38f6deee3ba4aca799fd7502eb8b4` | `8756d6bd9af4445f53153e0c62ae0d2c642d8106ad9965a4c1ea91e6b8be01e5` |
| `~/.codex/plugins/cache/openai-curated-remote/canva/14.0.0/skills/canva-resize-for-social-media/SKILL.md` | `bb36807630daf3ba7c2a27e83de64b329e03ce68457da874c36c5022ceff7094` | `3abab909232487860f33833f20ce2ea034107e97dae87812c8f2609f1b914051` |
| `~/.codex/plugins/cache/openai-curated-remote/figma/2.0.21/skills/figma-code-connect/SKILL.md` | `87af3996edb167d6aa3c044cb1bbb6a0d8e2d631c731bb896b1e1e8669640415` | `3552c8af383088d1df96627ebc3f6939254458c87351f68fb9f9acab15935b51` |
| `~/.codex/plugins/cache/openai-curated-remote/figma/2.0.21/skills/figma-generate-library/SKILL.md` | `3c995d483bbf4761392ba0c2e00df2b1b1c632cc05c6e7df57a2e89c311f53b7` | `e479d65ce7f2a5d9ab86f8bc6d1022aba9f788a44c966fce1e0b85faf96fe94e` |
| `~/.codex/plugins/cache/openai-curated-remote/openai-developers/1.2.3/skills/openai-platform-api-key/SKILL.md` | `780670286fb0acf32660abafc1bc34d7a25ff7a74af59e02db8fb62bbdd21ac2` | `ac58fbfc5e9c91492adac12d3b767a3cc328c793e53853d43a27ffddb6091aaa` |
| `~/.codex/plugins/cache/openai-curated-remote/openai-developers/1.2.3/skills/openai-platform-api-key/references/evals.md` | `38c21189b124eaf25761f3314252e4d4452f3ff74db7c2f84a7d651406890d25` | `0265d4de3ecb948f8c8a762db9b3549cc06df319c898ada0669f2c57ec778a0a` |
| `~/.codex/plugins/cache/openai-curated-remote/openai-developers/1.2.3/skills/openai-api-troubleshooting/SKILL.md` | `9fb4e152430c2f0475d1d14ce61b413267d322af9c032f2affb64698ca562662` | `f9c06af6735f3b4465831653b240a0cfa254c19622a253c125699cb3f917b148` |
| `~/.codex/plugins/cache/openai-bundled/sites/0.1.57/skills/sites-hosting/SKILL.md` | `a94792641384391d45edb3a45e30cd7c3db58d88c63d94e0b2111ffc485aaf72` | `5bdecbaa588188224ec2d3d3f3e1f04d268ce2532155e279513b4cd53bc23771` |

## Screened entrypoint inventory

This lists on-disk candidates; presence in the cache does not prove active registration.

- `~/.agents/skills/computer-use/SKILL.md`
- `~/.agents/skills/find-skills/SKILL.md`
- `~/.agents/skills/orca-cli/SKILL.md`
- `~/.agents/skills/orchestration/SKILL.md`
- `~/.agents/skills/twg-agentic-search/SKILL.md`
- `~/.agents/skills/twg-bench-lite/SKILL.md`
- `~/.agents/skills/twg-confluence/SKILL.md`
- `~/.agents/skills/twg-context-discovery/SKILL.md`
- `~/.agents/skills/twg-engineering-work/SKILL.md`
- `~/.agents/skills/twg-jira-resolve-merged-work/SKILL.md`
- `~/.agents/skills/twg-jira/SKILL.md`
- `~/.agents/skills/twg-operational-health/SKILL.md`
- `~/.agents/skills/twg-responsibility-routing/SKILL.md`
- `~/.agents/skills/twg-status-rollups/SKILL.md`
- `~/.agents/skills/twg/SKILL.md`
- `~/.codex/plugins/cache/openai-bundled/record-and-replay/1.0.1000926/skills/record-and-replay/SKILL.md`
- `~/.codex/plugins/cache/openai-bundled/sites/0.1.57/skills/sites-building/SKILL.md`
- `~/.codex/plugins/cache/openai-bundled/sites/0.1.57/skills/sites-hosting/SKILL.md`
- `~/.codex/plugins/cache/openai-bundled/visualize/1.0.29/skills/visualize/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/app-6a3c278c93ac8191b29768648d63a754/0.2.2/skills/provision-droplet/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/canva/14.0.0/skills/canva-brand-check/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/canva/14.0.0/skills/canva-branded-presentation/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/canva/14.0.0/skills/canva-bulk-create/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/canva/14.0.0/skills/canva-design-feedback/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/canva/14.0.0/skills/canva-edit-design/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/canva/14.0.0/skills/canva-implement-feedback/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/canva/14.0.0/skills/canva-resize-for-social-media/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/canva/14.0.0/skills/canva-translate-design/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/deep-research-work/0.1.14/skills/deep-research/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/figma/2.0.21/skills/figma-code-connect/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/figma/2.0.21/skills/figma-create-new-file/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/figma/2.0.21/skills/figma-design-to-code/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/figma/2.0.21/skills/figma-generate-design/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/figma/2.0.21/skills/figma-generate-diagram/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/figma/2.0.21/skills/figma-generate-library/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/figma/2.0.21/skills/figma-implement-motion/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/figma/2.0.21/skills/figma-swiftui/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/figma/2.0.21/skills/figma-use-figjam/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/figma/2.0.21/skills/figma-use-motion/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/figma/2.0.21/skills/figma-use-slides/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/figma/2.0.21/skills/figma-use/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/open-design/0.5.2/skills/open-design-mode/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/openai-developers/1.2.3/skills/agents-sdk/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/openai-developers/1.2.3/skills/build-chatgpt-app/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/openai-developers/1.2.3/skills/chatgpt-app-submission/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/openai-developers/1.2.3/skills/openai-api-troubleshooting/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/openai-developers/1.2.3/skills/openai-platform-api-key/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.1/skills/artifact-template-analytics-dashboard/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.1/skills/artifact-template-business-review/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.1/skills/artifact-template-design-report/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.1/skills/artifact-template-experiment-analysis/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.1/skills/artifact-template-financial-budget/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.1/skills/artifact-template-investment-committee-memo/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.1/skills/artifact-template-legal-memorandum/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.1/skills/artifact-template-market-trends-report/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.1/skills/artifact-template-minimal-letterhead/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.1/skills/artifact-template-operating-calendar/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.1/skills/artifact-template-operating-review/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.1/skills/artifact-template-project-kickoff/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.1/skills/artifact-template-project-tracker/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.1/skills/artifact-template-sales-pipeline/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.1/skills/artifact-template-simple-dark-mode/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.1/skills/artifact-template-simple-light-mode/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.1/skills/artifact-template-strategy-memorandum/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.1/skills/artifact-template-system-design/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.1/skills/artifact-template-team-alignment/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.1/skills/artifact-template-three-statement-forecast/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/plugin-management/0.1.0/skills/plugin-management/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/product-design/0.1.53/skills/audit/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/product-design/0.1.53/skills/design-qa/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/product-design/0.1.53/skills/get-context/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/product-design/0.1.53/skills/ideate/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/product-design/0.1.53/skills/image-to-code/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/product-design/0.1.53/skills/index/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/product-design/0.1.53/skills/research/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/product-design/0.1.53/skills/share/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/product-design/0.1.53/skills/url-to-code/SKILL.md`
- `~/.codex/plugins/cache/openai-curated-remote/product-design/0.1.53/skills/user-context/SKILL.md`
- `~/.codex/plugins/cache/openai-curated/build-web-apps/1e285826/skills/frontend-app-builder/SKILL.md`
- `~/.codex/plugins/cache/openai-curated/build-web-apps/1e285826/skills/frontend-testing-debugging/SKILL.md`
- `~/.codex/plugins/cache/openai-curated/build-web-apps/1e285826/skills/react-best-practices/SKILL.md`
- `~/.codex/plugins/cache/openai-curated/build-web-apps/1e285826/skills/shadcn-best-practices/SKILL.md`
- `~/.codex/plugins/cache/openai-curated/build-web-apps/1e285826/skills/stripe-best-practices/SKILL.md`
- `~/.codex/plugins/cache/openai-curated/build-web-apps/1e285826/skills/supabase-best-practices/SKILL.md`
- `~/.codex/plugins/cache/openai-curated/hyperframes/1e285826/skills/gsap/SKILL.md`
- `~/.codex/plugins/cache/openai-curated/hyperframes/1e285826/skills/hyperframes-cli/SKILL.md`
- `~/.codex/plugins/cache/openai-curated/hyperframes/1e285826/skills/hyperframes-registry/SKILL.md`
- `~/.codex/plugins/cache/openai-curated/hyperframes/1e285826/skills/hyperframes/SKILL.md`
- `~/.codex/plugins/cache/openai-curated/hyperframes/1e285826/skills/website-to-hyperframes/SKILL.md`
- `~/.codex/plugins/cache/openai-primary-runtime/documents/26.904.11930/skills/documents/SKILL.md`
- `~/.codex/plugins/cache/openai-primary-runtime/pdf/26.904.11930/skills/pdf/SKILL.md`
- `~/.codex/plugins/cache/openai-primary-runtime/presentations/26.904.11930/skills/presentations/SKILL.md`
- `~/.codex/plugins/cache/openai-primary-runtime/spreadsheets/26.904.11930/skills/excel-live-control/SKILL.md`
- `~/.codex/plugins/cache/openai-primary-runtime/spreadsheets/26.904.11930/skills/spreadsheets/SKILL.md`
- `~/.codex/plugins/cache/openai-primary-runtime/template-creator/26.904.11930/skills/template-creator/SKILL.md`
- `~/.codex/skills/.system/imagegen/SKILL.md`
- `~/.codex/skills/.system/openai-docs/SKILL.md`
- `~/.codex/skills/.system/plugin-creator/SKILL.md`
- `~/.codex/skills/.system/review-agent/SKILL.md`
- `~/.codex/skills/.system/skill-creator/SKILL.md`
- `~/.codex/skills/.system/skill-installer/SKILL.md`
- `~/.codex/skills/bk-approve/SKILL.md`
- `~/.codex/skills/bk-credential/SKILL.md`
- `~/.codex/skills/bk-design/SKILL.md`
- `~/.codex/skills/bk-help/SKILL.md`
- `~/.codex/skills/bk-import/SKILL.md`
- `~/.codex/skills/bk-improve/SKILL.md`
- `~/.codex/skills/bk-instruction/SKILL.md`
- `~/.codex/skills/bk-next/SKILL.md`
- `~/.codex/skills/bk-report/SKILL.md`
- `~/.codex/skills/bk-rewind/SKILL.md`
- `~/.codex/skills/bk-scan/SKILL.md`
- `~/.codex/skills/bk-share/SKILL.md`
- `~/.codex/skills/bk-start/SKILL.md`
- `~/.codex/skills/bk-status/SKILL.md`
- `~/.codex/skills/bk-version/SKILL.md`
- `~/.codex/skills/bottari-illust/SKILL.md`
- `~/.codex/skills/hanatalk-note-cleanup/SKILL.md`
- `~/.codex/skills/sonol-agent-runtime/SKILL.md`
- `~/.codex/skills/sonol-multi-agent/SKILL.md`
- `~/.codex/skills/wrks-ai-chat/SKILL.md`
