# Workflow Lab

Workflow Lab is a browser-based concierge-MVP prototype for improving one recurring workflow at a time. It maps the current process, diagnoses wasted effort and risk, proposes an executable redesign, and produces reusable templates, AI-assisted instructions, checkpoints, and a measurement plan.

The first two complete workflows are professor lecture preparation and student weekly academic planning. Generic professor workflows also receive an approved-tool/data-boundary preflight, an academic decision record, and a run evidence log so a real pilot can preserve human authority and measure a second run. A user can complete the intake and immediately generate, inspect, and download their workflow package in the browser. After a real run, the user can report one failed step, record usefulness/time/corrections, review a locally drafted correction, and explicitly approve it before it replaces the active package. Generation and correction drafting are local and deterministic; the prototype does not call an AI provider or send intake or feedback data to a server.

## Run the website

Requirements: Node.js 20+ and pnpm.

```bash
pnpm install
pnpm dev
```

Open the local URL shown by Vite. The six routes are `/`, `/how-it-works`, `/workflows`, `/demo`, `/intake`, and `/sample-result`.

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

- `src/data/fixtures.ts`: realistic intake fixtures and workflow-library cards.
- `src/engine/`: validation, scoring, classification, generation, Markdown output, and CLI.
- `src/revision.ts`: validated complaint-to-correction drafting and mandatory approval boundary.
- `src/App.tsx`: route views, interactive demo, intake-to-package generation, and sample result.
- `src/config.ts`: centralized working name and primary public copy.
- `schemas/`: portable JSON Schema for exported intake data.
- `examples/`: schema-valid intake JSON for lecture preparation, student planning, and the professor assignment-redesign pilot preflight.
- `workflows/`: operating definitions for the first two complete templates.
- `generated/`: local engine output; safe to regenerate.
- `validation/`: evidence-gathering protocols for professor pilots.
- `.github/workflows/quality.yml`: automated push and pull-request quality gate.

See `PRODUCT_SPEC.md`, `MVP_SCOPE.md`, `TECHNICAL_SPEC.md`, `WEBSITE_SPEC.md`, `WORKFLOW_ENGINE_SPEC.md`, and `IMPLEMENTATION_STATUS.md` for the product and implementation contract.

## Current limits

This is a local prototype, not production software. It has no authentication, database, payments, external AI calls, analytics, integrations, permanent workflow history, durable complaint storage, or collaboration. Its correction draft is a transparent rule-based prototype of the future AI-assisted revision experience; feedback exists only in the current page session. Estimated time savings are hypotheses to test with real users, not promises.
