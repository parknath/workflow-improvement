# Implementation status

Last updated: 2026-07-22

## Current state

The public prototype remains available at https://parknath.github.io/workflow-improvement/. The server-capable owner beta is live at https://workflow-improvement.vercel.app/inbox-automation with Google web OAuth, a protected OpenAI classifier, reviewed Google Sheets writes, and reviewed Google Calendar event creation. The owner beta is an integration test surface, not evidence that accounts, billing, durable storage, or customer readiness exist.

## Completed implementation

- TypeScript intake types and portable JSON Schema.
- Intake validation, step scoring, classifications, opportunity ranking, and deterministic generation.
- Professor lecture-preparation redesign with 11 executable steps and required reusable assets.
- Ready-made professor assignment-redesign and course-material organization workflows with complete safe inputs, outputs, review boundaries, and package generation.
- Student weekly-planning redesign with 10 executable steps and required reusable assets.
- JSON plus nine-file Markdown package renderer and CLI.
- Seven-route responsive website with homepage, method, library, demo, six-step intake, complete sample result, and inbox automation.
- A preset-first homepage with three common professor improvements, a short ready-made summary, one-click package generation, optional customization, saved-draft continuation, and a detailed six-step intake only for workflows the defaults do not cover.
- Browser-only intake persistence, step editing/reordering/removal, validation, and JSON download.
- End-to-end local intake-to-package generation with complete redesigned steps, reusable assets, measurement guidance, package download, and an explicit no-server/no-provider disclosure.
- Action-first generated result with active version, objective, immediate next action, one primary start/resume control, and progressively disclosed diagnosis, full workflow, assets, measurement guidance, and downloads.
- Browser-local guided workflow runs with one-step focus, complete/skip/back/problem/end controls, progress restoration after refresh, and explicit external-tool and academic-responsibility boundaries.
- Reusable assets mapped into relevant workflow steps with purpose, copy action, human-verification guidance, and prohibited-use boundaries.
- Browser-local comparable-run measurement for completion, actual time, usefulness, corrections, skipped steps, useful asset, weak step, reuse intent, and next-run change, plus copyable/downloadable evidence.
- Problem reporting with expected versus actual outcome, fit reason, failure type, and optional preferred correction.
- Local rule-based correction drafting that changes only the reported step, presents the current and proposed instructions side by side, retains a safe fallback, and requires explicit human approval before active-version replacement.
- The current completed run and one prior comparable summary now produce an explicit two-run comparison for time, usefulness, corrections, completion, and workflow version. The same two existing browser-local record slots are reused rather than expanding retained history; observed differences are not labeled as causation.
- A run keeps its starting workflow version when a correction becomes active. Approval ends the affected run for measurement, and the revised workflow begins on the next run, preserving the provenance required for an honest comparison.
- Human-review, privacy, safety, failure/escalation, and measurement controls.
- Product, scope, technical, website, engine, and run documentation.
- A professor assignment-redesign pilot protocol with uncoached task instructions, safety boundaries, two-run evidence capture, separate willingness-to-pay questions, and precommitted continue/change/kill rules.
- A privacy-minimized professor-pilot JSON record, Draft 2020-12 schema, ignored private-record location, completeness checker, and five-pilot cohort evaluator that keeps usefulness, recurring-format preference, payer, and payment-oriented commitment separate. Synthetic examples cannot count as evidence.
- A schema-valid assignment-redesign pilot fixture that exercises the generic professor path before a live pilot.
- Generic professor workflow assets for approved-tool/data-boundary preflight, accountable academic decisions, and second-run evidence capture.
- Correct separation between reviewable `AI_ASSIST` drafting and `HUMAN_ONLY` academic decisions; mandatory human review remains explicit for assisted steps.
- Git version history is connected to the public `parknath/workflow-improvement` repository through the dedicated SSH identity, with `main` published and rollback available through `git revert` plus the deployment workflow.
- A single `pnpm verify` quality gate covering tests, type checking, build, package generation, JSON Schema validation, generated-package audits, and seven-route HTTP checks, mirrored in GitHub Actions for every push and pull request.
- A GitHub Pages deployment workflow that reruns the full gate, creates a project-base artifact with static entries for all seven routes, and publishes through the protected `github-pages` environment.
- A real owner-beta “Inbox to action list” preset that reads bounded Gmail metadata, uses ChatGPT structured output instead of rule-based classification, requires review, then performs selected idempotent Google Sheets and Calendar writes.
- A regression fix for custom list fields that preserves raw editing text, including spaces inside multi-word values, while separately maintaining normalized comma/newline-delimited arrays.
- A protected stateless classifier endpoint and a Vercel deployment shape that keep the OpenAI key and Slack-style client secrets out of the browser.
- Preliminary owner-beta hardening: no committed credentials or known production dependency advisories, CSP and anti-framing/browser-capability headers, non-cacheable classifier responses, JSON and 64 KiB request gates, page-memory-only access key handling, and a five-message labeled-inbox default.

## Verification record

- Owner-beta security follow-up: `pnpm verify` passed 58 tests, strict type checking, the production build, both package generators, schema and package audits, and all seven routes. `pnpm audit --prod` found no known vulnerabilities; repository and history scans found no committed provider keys, private keys, credential files, or token files. The deployed security headers and Google OAuth behavior require separate live verification after release.
- `pnpm test`: passed 34 tests covering the prior engine, intake, revision, and routing contracts plus asset-to-step mapping, run start/complete/skip/back behavior, browser persistence and corrupt-state recovery, problem recording, comparable-run measurement, previous-version preservation and retrieval, baseline promotion without added retention, revision-to-next-run version provenance, two-run deltas, and server-rendered overview/run/measurement/comparison/revision states.
- `pnpm run typecheck`: passed with TypeScript strict mode.
- `pnpm run build`: passed; Vite produced the production bundle.
- `pnpm generate`: passed; generated professor JSON plus nine non-empty Markdown files.
- `pnpm generate -- --student`: passed; generated student JSON plus nine non-empty Markdown files.
- Draft 2020-12 JSON Schema: `examples/lecture-intake.json`, `examples/student-intake.json`, and `examples/assignment-redesign-intake.json` passed validation.
- Generated-package audit: professor package has 11 executable redesigned steps, 9 reusable assets, a 240-minute baseline, and a clearly labeled 124-minute prototype target; student package has 10 executable redesigned steps, 10 reusable assets, a 100-minute baseline, and a clearly labeled 80-minute prototype target.
- Generated content inspection: current maps include actions, inputs, outputs, tools, time, and pain points; operating guides include human checkpoints and escalation; example runs are explicitly illustrative; measurement plans include before/after step counts, corrections, effort, repeatability, and post-use feedback.
- Route smoke check: all seven production routes return HTTP 200. The built bundle contract requires the start action, immediate next action, complete/problem controls, first-run measurement, approval action, browser workspace key, external-tool disclosure, ChatGPT scan, review, and explicit write controls. Non-GUI package audits require executable actions, human review, and stop conditions.
- `pnpm verify`: passed the complete local gate before the final revision-transition regression was added; the final gate with 34 tests is recorded in `daily/2026-07-20.md`. The sandboxed runner required the bundled Node path and an approved unsandboxed run because `tsx` opens a local IPC socket.
- GitHub quality and Pages workflows passed for release commit `382ac33`. The deployed root plus `/how-it-works/`, `/workflows/`, `/demo/`, `/intake/`, and `/sample-result/` returned HTTPS 200. Desktop rendering and a 390px intake layout were checked; the mobile page had no horizontal overflow.
- The simplified self-use release `070777a` also passed both remote workflows. The live homepage and intake returned HTTPS 200, the three starter choices rendered, and the lecture starter opened the six-step intake with its editable example selected.
- The preset-first release `8cb6131` passed both remote workflows. The live assignment-redesign option opened a ready-made summary and generated the complete package without rendering the detailed intake form; the custom-workflow escape hatch and mobile layouts also passed.
- Guided-execution release `23dccda` and retrieval follow-up `06c2521` passed remote quality and every Pages job step. The public root and all five deep routes returned HTTPS 200; the final deployed bundle contains the action-first result, step controls, measurement, approval, previous-version download, next-run, persistence, and external-tool-boundary contracts.

## Assumptions

- The concierge operator reviews generated packages before early-user delivery.
- The user supplies accurate baseline time and approved source material.
- The prototype target time is a planning estimate, not a promised result.
- Browser storage is acceptable for non-sensitive prototype drafts, workflow progress, one previous workflow version, the current run, and one prior comparable run summary on one device.

## Known limitations

- No production backend or durable cross-device storage.
- No durable server or cross-device history. The current browser retains one active workflow, one immediately previous approved version, the current run, pending revision, and one prior comparable run summary; clearing site data removes them.
- Guided package generation and correction drafting remain deterministic. The live inbox preset uses external ChatGPT classification only after explicit disclosure and owner-beta access-key entry.
- No professor accounts, subscription billing, product analytics, durable cross-device history, or collaboration. Google is the only live connector; Slack remains unavailable.
- Public routes use static per-route entry files; client navigation remains History API based.
- There is no GUI browser end-to-end suite. Pure run behavior, persisted-state contracts, server-rendered critical UI states, production bundle contracts, and all routes are automated; final interaction still needs observation with a real user.
- Usability and time-saving claims still require testing with real professors and students.
- GitHub Pages is a static prototype host, not evidence that authentication, durable storage, billing, analytics, or other sellable-beta infrastructure exists.
- Slack is not connected yet. Its OAuth exchange requires a server-held client secret and a dedicated backend connector.

## Recommended first-user test

1. Recruit one professor with a lecture due within seven days and one student planning a real academic week.
2. Complete the intake from their actual current process without coaching them toward the fixture answers.
3. Have the concierge operator review the generated package for privacy, accuracy, and executable detail.
4. Ask each user to use **Start workflow** and complete the guided run without coaching; record actual time, corrections, usefulness, skipped steps, help points, and any genuine problem.
5. Review and approve or reject only a genuine draft correction, then run the active workflow a second time without operator help to test repeatability and recurring value.
6. Revise only the failing instructions or assets; do not add new product scope until both users can complete a second run.
