# Implementation status

Last updated: 2026-07-19

## Current state

The first public static prototype is complete against the 2026-07-15 handoff definition of done and is available at https://parknath.github.io/workflow-improvement/.

## Completed implementation

- TypeScript intake types and portable JSON Schema.
- Intake validation, step scoring, classifications, opportunity ranking, and deterministic generation.
- Professor lecture-preparation redesign with 11 executable steps and required reusable assets.
- Ready-made professor assignment-redesign and course-material organization workflows with complete safe inputs, outputs, review boundaries, and package generation.
- Student weekly-planning redesign with 10 executable steps and required reusable assets.
- JSON plus nine-file Markdown package renderer and CLI.
- Six-route responsive website with homepage, method, library, demo, six-step intake, and complete sample result.
- A preset-first homepage with three common professor improvements, a short ready-made summary, one-click package generation, optional customization, saved-draft continuation, and a detailed six-step intake only for workflows the defaults do not cover.
- Browser-only intake persistence, step editing/reordering/removal, validation, and JSON download.
- End-to-end local intake-to-package generation with complete redesigned steps, reusable assets, measurement guidance, package download, and an explicit no-server/no-provider disclosure.
- Action-first generated result with active version, objective, immediate next action, one primary start/resume control, and progressively disclosed diagnosis, full workflow, assets, measurement guidance, and downloads.
- Browser-local guided workflow runs with one-step focus, complete/skip/back/problem/end controls, progress restoration after refresh, and explicit external-tool and academic-responsibility boundaries.
- Reusable assets mapped into relevant workflow steps with purpose, copy action, human-verification guidance, and prohibited-use boundaries.
- Browser-local first-run measurement for completion, actual time, usefulness, corrections, skipped steps, useful asset, weak step, reuse intent, and next-run change, plus copyable/downloadable run summaries.
- Problem reporting with expected versus actual outcome, fit reason, failure type, and optional preferred correction.
- Local rule-based correction drafting that changes only the reported step, presents the current and proposed instructions side by side, retains a safe fallback, and requires explicit human approval before active-version replacement.
- Active workflow, latest run summary, pending revision, and immediately previous approved version persist in the current browser, providing a safe first-run-to-next-run improvement loop without claiming unmeasured outcomes.
- Human-review, privacy, safety, failure/escalation, and measurement controls.
- Product, scope, technical, website, engine, and run documentation.
- A professor assignment-redesign pilot protocol with uncoached task instructions, safety boundaries, two-run evidence capture, separate willingness-to-pay questions, and precommitted continue/change/kill rules.
- A schema-valid assignment-redesign pilot fixture that exercises the generic professor path before a live pilot.
- Generic professor workflow assets for approved-tool/data-boundary preflight, accountable academic decisions, and second-run evidence capture.
- Correct separation between reviewable `AI_ASSIST` drafting and `HUMAN_ONLY` academic decisions; mandatory human review remains explicit for assisted steps.
- Git version history is connected to the public `parknath/workflow-improvement` repository through the dedicated SSH identity, with `main` published and rollback available through `git revert` plus the deployment workflow.
- A single `pnpm verify` quality gate covering tests, type checking, build, package generation, JSON Schema validation, generated-package audits, and six-route HTTP checks, mirrored in GitHub Actions for every push and pull request.
- A GitHub Pages deployment workflow that reruns the full gate, creates a project-base artifact with static entries for all six routes, and publishes through the protected `github-pages` environment.

## Verification record

- `pnpm test`: passed 30 tests covering the prior engine, intake, revision, and routing contracts plus asset-to-step mapping, run start/complete/skip/back behavior, browser persistence and corrupt-state recovery, problem recording, first-run measurement, previous-version preservation and retrieval, next-run baseline retention, and server-rendered overview/run/measurement/summary/revision states.
- `pnpm run typecheck`: passed with TypeScript strict mode.
- `pnpm run build`: passed; Vite produced the production bundle.
- `pnpm generate`: passed; generated professor JSON plus nine non-empty Markdown files.
- `pnpm generate -- --student`: passed; generated student JSON plus nine non-empty Markdown files.
- Draft 2020-12 JSON Schema: `examples/lecture-intake.json`, `examples/student-intake.json`, and `examples/assignment-redesign-intake.json` passed validation.
- Generated-package audit: professor package has 11 executable redesigned steps, 9 reusable assets, a 240-minute baseline, and a clearly labeled 124-minute prototype target; student package has 10 executable redesigned steps, 10 reusable assets, a 100-minute baseline, and a clearly labeled 80-minute prototype target.
- Generated content inspection: current maps include actions, inputs, outputs, tools, time, and pain points; operating guides include human checkpoints and escalation; example runs are explicitly illustrative; measurement plans include before/after step counts, corrections, effort, repeatability, and post-use feedback.
- Route smoke check: all six production routes return HTTP 200. The built bundle contract requires the start action, immediate next action, complete/problem controls, first-run measurement, approval action, browser workspace key, and external-tool disclosure. Non-GUI package audits require executable actions, human review, and stop conditions.
- `pnpm verify`: passed the complete local gate on 2026-07-19, including all three example schema checks, both generated-package audits, and all six HTTP routes.
- GitHub quality and Pages workflows passed for release commit `382ac33`. The deployed root plus `/how-it-works/`, `/workflows/`, `/demo/`, `/intake/`, and `/sample-result/` returned HTTPS 200. Desktop rendering and a 390px intake layout were checked; the mobile page had no horizontal overflow.
- The simplified self-use release `070777a` also passed both remote workflows. The live homepage and intake returned HTTPS 200, the three starter choices rendered, and the lecture starter opened the six-step intake with its editable example selected.
- The preset-first release `8cb6131` passed both remote workflows. The live assignment-redesign option opened a ready-made summary and generated the complete package without rendering the detailed intake form; the custom-workflow escape hatch and mobile layouts also passed.
- Guided-execution release `23dccda` and retrieval follow-up `06c2521` passed remote quality and every Pages job step. The public root and all five deep routes returned HTTPS 200; the final deployed bundle contains the action-first result, step controls, measurement, approval, previous-version download, next-run, persistence, and external-tool-boundary contracts.

## Assumptions

- The concierge operator reviews generated packages before early-user delivery.
- The user supplies accurate baseline time and approved source material.
- The prototype target time is a planning estimate, not a promised result.
- Browser storage is acceptable for non-sensitive prototype drafts, workflow progress, one previous version, and the latest run baseline on one device.

## Known limitations

- No production backend or durable cross-device storage.
- No durable server or cross-device history. The current browser retains one active workflow, one immediately previous approved version, the current run, pending revision, and latest run summary; clearing site data removes them.
- No external AI generation; package generation and correction drafting are deterministic prototype behavior, while AI steps remain instructions and mock content.
- No authentication, integrations, analytics, or collaboration.
- Public routes use static per-route entry files; client navigation remains History API based.
- There is no GUI browser end-to-end suite. Pure run behavior, persisted-state contracts, server-rendered critical UI states, production bundle contracts, and all routes are automated; final interaction still needs observation with a real user.
- Usability and time-saving claims still require testing with real professors and students.
- GitHub Pages is a static prototype host, not evidence that authentication, durable storage, billing, analytics, or other sellable-beta infrastructure exists.

## Recommended first-user test

1. Recruit one professor with a lecture due within seven days and one student planning a real academic week.
2. Complete the intake from their actual current process without coaching them toward the fixture answers.
3. Have the concierge operator review the generated package for privacy, accuracy, and executable detail.
4. Ask each user to use **Start workflow** and complete the guided run without coaching; record actual time, corrections, usefulness, skipped steps, help points, and any genuine problem.
5. Review and approve or reject only a genuine draft correction, then run the active workflow a second time without operator help to test repeatability and recurring value.
6. Revise only the failing instructions or assets; do not add new product scope until both users can complete a second run.
