# Workflow Lab

Workflow Lab is a concierge-MVP for improving one recurring workflow at a time. It maps the current process, diagnoses wasted effort and risk, creates an executable redesign, and guides the user through each step with reusable templates, AI-assisted instructions, checkpoints, and comparable-run measurement. An owner-beta preset also implements a real Gmail-to-action workflow: ChatGPT classifies bounded email previews, the user reviews every proposal, and approved actions can be written to Google Sheets or Google Calendar.

The first two complete guided workflows are professor lecture preparation and student weekly academic planning. Generic professor workflows also receive an approved-tool/data-boundary preflight, an academic decision record, and a run evidence log. A user can generate a ready-made workflow, start it immediately, complete or skip one step at a time, use assets in context, report a problem, approve or reject a local draft revision, and compare the next measured run with the prior baseline. The current run and one prior comparable summary reuse the same two browser-local record slots that previously held a duplicated latest result; no additional run history is retained. Active and previous workflow versions plus the measured evidence can be downloaded. Guided package generation and correction drafting remain local and deterministic; only the explicitly consented inbox preset sends bounded message previews to the protected ChatGPT endpoint.

## Run the website

Requirements: Node.js 20+ and pnpm.

```bash
pnpm install
pnpm dev
```

Open the local URL shown by Vite. The seven routes are `/`, `/how-it-works`, `/workflows`, `/demo`, `/intake`, `/sample-result`, and `/inbox-automation`.

### Configure the owner-beta inbox automation

Copy `.env.example` into the deployment environment and configure:

- `VITE_GOOGLE_CLIENT_ID`: a Google OAuth **web** client whose authorized JavaScript origin matches the final site. Enable Gmail, Sheets, and Calendar APIs.
- `OPENAI_API_KEY`: server-only key used by `/api/classify`; it must never be exposed through a `VITE_` variable.
- `AUTOMATION_ACCESS_KEY`: a server-only shared gate. The owner enters the matching value in the browser session before classification.
- `OPENAI_MODEL`: optional model override; the default is `gpt-5.6-luna`.

The Google token stays in React memory and is revoked on disconnect. Gmail access is read-only. Only sender, subject, received timestamp, and a snippet capped at 1,000 characters are sent to the protected ChatGPT endpoint; full bodies and attachments are not requested. Sheets and Calendar writes occur only after item-by-item review. Gmail message IDs deduplicate Sheet rows and deterministic Calendar event IDs make retries idempotent.

The included `vercel.json` provides a server-capable deployment shape for the Vite client plus `/api/classify`. GitHub Pages remains a static-hosted prototype and cannot run that API route. Slack is deliberately not claimed as connected: its OAuth code exchange requires a server-held client secret and a separate connector backend.

## Public website

Use the public prototype at [parknath.github.io/workflow-improvement](https://parknath.github.io/workflow-improvement/).

To use it on yourself:

1. Choose **Prepare a weekly lecture**, **Update an assignment for AI**, or **Organize course materials**.
2. Review the short ready-made summary and select **Use this workflow**. No detailed intake is required.
3. Select **Start workflow** and follow one clear step at a time. Reusable assets appear in the steps where they are needed.
4. Complete, skip, revisit, or report a problem with a step. The active version does not change until you approve a draft revision.
5. Record actual time, usefulness, corrections, reuse intent, and the next change. On the following run, Workflow Lab shows factual time, usefulness, correction, completion, and workflow-version differences without claiming causation.
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

`pnpm verify` runs tests, strict type checking, the production build, both package generators, JSON Schema checks, generated-package audits, and seven-route HTTP smoke checks. The same gate runs on every push and pull request through GitHub Actions.

The professor pilot protocol now includes a privacy-minimized JSON record, schema, recruitment and payer-path screen, and cohort evaluator. Copy `validation/professor-pilot-record.template.json` into the ignored `validation/private-records/` directory, then run `pnpm pilots:check -- <record.json>`. Synthetic fixtures are excluded automatically, incomplete substitute/spend/funding evidence is reported, coverage by discipline/course/assignment/recurrence/policy/payer remains visible, and the keep/change/pause decision is withheld until five complete real pilot records exist.

## Architecture

- `src/data/fixtures.ts`: realistic ready-made workflow inputs and workflow-library cards.
- `src/engine/`: validation, scoring, classification, generation, Markdown output, and CLI.
- `src/revision.ts`: validated problem-to-correction drafting and mandatory approval boundary.
- `src/workflowRun.ts`: browser-local active workflow, run progress, measurement, prior-run comparison, previous-version, and evidence export behavior.
- `src/WorkflowExperience.tsx`: action-first result, guided workflow run, contextual assets, measurement, and revision UI.
- `src/App.tsx`: public routes, preset selection, detailed intake, interactive demo, and sample result.
- `src/InboxAutomation.tsx`: Google OAuth connection, Gmail scan, review queue, and explicit write approval UI.
- `src/googleAutomation.ts`: bounded Gmail reads plus idempotent Sheets and Calendar writes.
- `src/emailClassification.ts` and `api/classify.ts`: strict client/server boundary for ChatGPT classification.
- `src/config.ts`: centralized working name and primary public copy.
- `schemas/`: portable JSON Schema for exported intake data.
- `examples/`: schema-valid intake JSON for lecture preparation, student planning, and the professor assignment-redesign pilot preflight.
- `workflows/`: operating definitions for the first two complete templates.
- `generated/`: local engine output; safe to regenerate.
- `validation/`: evidence-gathering protocols for professor pilots.
- `.github/workflows/quality.yml`: automated push and pull-request quality gate.

See `PRODUCT_SPEC.md`, `MVP_SCOPE.md`, `TECHNICAL_SPEC.md`, `WEBSITE_SPEC.md`, `WORKFLOW_ENGINE_SPEC.md`, and `IMPLEMENTATION_STATUS.md` for the product and implementation contract.

## Current limits

The public GitHub Pages release is still a static prototype, not production software. It has no professor accounts, database, payments, analytics, cross-device history, durable server storage, or collaboration. The guided workflow correction draft remains deterministic; the owner-beta inbox preset uses ChatGPT only when deployed on a server-capable host with the required credentials. Browser data can disappear when site data is cleared and should not contain confidential or identifiable student information. Estimated time savings and recurring value are hypotheses to test with comparable real runs, not promises.
