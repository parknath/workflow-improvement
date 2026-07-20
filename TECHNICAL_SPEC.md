# Technical specification

## Stack

React 19, TypeScript, Vite, Vitest, Lucide icons, and the server-side OpenAI SDK. The core guided workflow has no runtime service or database. The owner-beta inbox preset adds a stateless server function for protected ChatGPT classification; provider keys remain server-only.

## Runtime model

The browser application uses History API routing for seven prototype routes. Intake state is React state mirrored to `localStorage`. A separate validated browser-local workspace stores the active generated workflow, immediately previous approved version, current run state, pending deterministic revision, and one prior comparable run summary. The current completed run is summarized from its existing state; starting another run promotes that result into the prior-summary slot. This avoids duplicated latest-result storage and does not add run-history retention. Corrupt stored workspace data is discarded safely. Downloads use temporary object URLs. Guided-workflow intake and feedback do not leave the browser.

The `/inbox-automation` preset uses Google Identity Services' browser token model. A short-lived OAuth token is held in React state only and requests Gmail read-only, Sheets, and Calendar event scopes. Gmail list/get requests use metadata format; the browser sends only message ID, sender, subject, timestamp, and a 1,000-character maximum snippet to `/api/classify`. The server function checks `AUTOMATION_ACCESS_KEY`, uses server-only `OPENAI_API_KEY`, calls the Responses API with a strict JSON Schema, and stores no model response. The browser validates that there is exactly one result per source message before displaying drafts. Nothing is written until the user selects the Sheet and/or Calendar action. Sheet rows are deduplicated by Gmail message ID; Calendar events use deterministic IDs and private visibility.

The CLI selects a fixture, validates it, computes step scores and classifications, generates a package, and writes structured JSON plus Markdown files to `generated/<workflow-slug>/`.

## Extension points

- Add workflow-specific redesigned blueprints and assets in `src/engine/generator.ts`.
- Add fixture intake data and library cards in `src/data/fixtures.ts`.
- Add an LLM provider later behind a new interface that accepts validated, privacy-filtered inputs and returns structured drafts. Deterministic generation remains the fallback.
- Add schema validation with a JSON Schema library if exported files later enter a server-side pipeline.
- Move the owner-beta shared access gate to professor authentication before multi-user release.
- Implement Slack only behind a server connector that keeps its OAuth client secret off the browser.

## Error and safety behavior

Invalid intake never reaches package generation. The UI shows validation errors on review. Corrupt browser state is discarded safely. Every improved step includes review and stop/escalation conditions. AI-assisted content is limited to supplied material and requires human review.

A problem report can draft changes to one step's action, human review, and stop condition. The draft is stored separately from the active workflow. Approval copies the current active workflow into the single previous-version slot before replacement, ends the affected run for measurement, and makes the revision available to the next run; rejection clears the draft without changing the active version. The affected run retains the workflow version with which it started so the subsequent run can test the approved version honestly. Guided-run progress and measurement survive ordinary refreshes when browser storage is available.

The inbox classifier fails closed when the access gate, OpenAI key, input schema, or one-result-per-source contract is missing. Dates and times are accepted only in validated formats, and the model is instructed never to infer ambiguous dates. Calendar writes require a reviewed date. Gmail is never sent, deleted, archived, or modified.

## Verification

Vitest covers valid and invalid intake, list-field editing, workflow completeness, asset-to-step mapping, run start/progress/skip/back behavior, browser persistence and corrupt-state recovery, comparable-run measurement and deltas, version provenance, problem recording, revision gating, previous-version preservation, Google read/write contracts, classifier validation, and server-rendered critical UI states. TypeScript strict mode, Vite production build, generated-package audits, schemas, and HTTP/bundle contract checks provide the remaining gates.
