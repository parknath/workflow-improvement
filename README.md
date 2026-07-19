# Workflow Lab

Workflow Lab is a browser-based concierge-MVP prototype for improving one recurring workflow at a time. It maps the current process, diagnoses wasted effort and risk, creates an executable redesign, and guides the user through each step with reusable templates, AI-assisted instructions, checkpoints, and first-run measurement.

The first two complete workflows are professor lecture preparation and student weekly academic planning. Generic professor workflows also receive an approved-tool/data-boundary preflight, an academic decision record, and a run evidence log. A user can generate a ready-made workflow, start it immediately, complete or skip one step at a time, use assets in context, report a problem, approve or reject a local draft revision, and save a measured result as the baseline for the next run. The active workflow, in-progress run, last run summary, and immediately previous approved version stay in the current browser. Generation and correction drafting are local and deterministic; the prototype does not call an AI provider or send workflow or feedback data to a server.

## Run the website

Requirements: Node.js 20+ and pnpm.

```bash
pnpm install
pnpm dev
```

Open the local URL shown by Vite. The six routes are `/`, `/how-it-works`, `/workflows`, `/demo`, `/intake`, and `/sample-result`.

## Public website

Use the public prototype at [parknath.github.io/workflow-improvement](https://parknath.github.io/workflow-improvement/).

To use it on yourself:

1. Choose **Prepare a weekly lecture**, **Update an assignment for AI**, or **Organize course materials**.
2. Review the short ready-made summary and select **Use this workflow**. No detailed intake is required.
3. Select **Start workflow** and follow one clear step at a time. Reusable assets appear in the steps where they are needed.
4. Complete, skip, revisit, or report a problem with a step. The active version does not change until you approve a draft revision.
5. Record actual time, usefulness, corrections, reuse intent, and the next change. Use that measured result as the baseline for a comparable next run.
6. Use **Customize first** only when the default needs adjustment, or **Build a custom workflow** when none of the common options fits.

The prototype stores the draft in the current browser. Do not enter confidential or identifiable student information.

The public GitHub Pages release is built and deployed from `main` by `.github/workflows/pages.yml`. The release workflow reruns the full product gate, builds with the `/workflow-improvement/` project base, adds static entries for every product route, and deploys the immutable commit through the `github-pages` environment.

Build the Pages artifact locally:

```bash
pnpm build:pages
```

Public intake and feedback remain browser-only. The static host receives the normal web request but no workflow intake, generated package, or correction report is submitted to an application server. Roll back by reverting the release commit on `main`; the deployment workflow republishes the prior application state.

## Run the engine

Generate the professor package:

```bash
pnpm generate
```

Generate the student package:

```bash
pnpm generate -- --student
```

Packages are written under `generated/` as structured JSON plus nine Markdown files.

## Verify the prototype

```bash
pnpm test
pnpm typecheck
pnpm build
pnpm verify
```

`pnpm verify` runs tests, strict type checking, the production build, both package generators, JSON Schema checks, generated-package audits, and six-route HTTP smoke checks. The same gate runs on every push and pull request through GitHub Actions.

## Architecture

- `src/data/fixtures.ts`: realistic ready-made workflow inputs and workflow-library cards.
- `src/engine/`: validation, scoring, classification, generation, Markdown output, and CLI.
- `src/revision.ts`: validated problem-to-correction drafting and mandatory approval boundary.
- `src/workflowRun.ts`: browser-local active workflow, run progress, measurement, previous-version, and summary behavior.
- `src/WorkflowExperience.tsx`: action-first result, guided workflow run, contextual assets, measurement, and revision UI.
- `src/App.tsx`: public routes, preset selection, detailed intake, interactive demo, and sample result.
- `src/config.ts`: centralized working name and primary public copy.
- `schemas/`: portable JSON Schema for exported intake data.
- `examples/`: schema-valid intake JSON for lecture preparation, student planning, and the professor assignment-redesign pilot preflight.
- `workflows/`: operating definitions for the first two complete templates.
- `generated/`: local engine output; safe to regenerate.
- `validation/`: evidence-gathering protocols for professor pilots.
- `.github/workflows/quality.yml`: automated push and pull-request quality gate.

See `PRODUCT_SPEC.md`, `MVP_SCOPE.md`, `TECHNICAL_SPEC.md`, `WEBSITE_SPEC.md`, `WORKFLOW_ENGINE_SPEC.md`, and `IMPLEMENTATION_STATUS.md` for the product and implementation contract.

## Current limits

This is a public static prototype, not production software. It has no authentication, database, payments, external AI calls, analytics, integrations, cross-device history, durable server storage, or collaboration. Its correction draft is a transparent rule-based prototype of the future AI-assisted revision experience. Browser data can disappear when site data is cleared and should not contain confidential or identifiable student information. Estimated time savings and recurring value are hypotheses to test with comparable real runs, not promises.
