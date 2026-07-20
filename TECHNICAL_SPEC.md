# Technical specification

## Stack

React 19, TypeScript, Vite, Vitest, and Lucide icons. The project has no runtime service, database, API key, router dependency, or state-management dependency.

## Runtime model

The browser application uses History API routing for the six prototype routes. Intake state is React state mirrored to `localStorage`. A separate validated browser-local workspace stores the active generated workflow, immediately previous approved version, current run state, pending deterministic revision, and one prior comparable run summary. The current completed run is summarized from its existing state; starting another run promotes that result into the prior-summary slot. This avoids duplicated latest-result storage and does not add run-history retention. Corrupt stored workspace data is discarded safely. Downloads use temporary object URLs. No workflow or feedback data leaves the browser.

The CLI selects a fixture, validates it, computes step scores and classifications, generates a package, and writes structured JSON plus Markdown files to `generated/<workflow-slug>/`.

## Extension points

- Add workflow-specific redesigned blueprints and assets in `src/engine/generator.ts`.
- Add fixture intake data and library cards in `src/data/fixtures.ts`.
- Add an LLM provider later behind a new interface that accepts validated, privacy-filtered inputs and returns structured drafts. Deterministic generation remains the fallback.
- Add schema validation with a JSON Schema library if exported files later enter a server-side pipeline.

## Error and safety behavior

Invalid intake never reaches package generation. The UI shows validation errors on review. Corrupt browser state is discarded safely. Every improved step includes review and stop/escalation conditions. AI-assisted content is limited to supplied material and requires human review.

A problem report can draft changes to one step's action, human review, and stop condition. The draft is stored separately from the active workflow. Approval copies the current active workflow into the single previous-version slot before replacement, ends the affected run for measurement, and makes the revision available to the next run; rejection clears the draft without changing the active version. The affected run retains the workflow version with which it started so the subsequent run can test the approved version honestly. Guided-run progress and measurement survive ordinary refreshes when browser storage is available.

## Verification

Vitest covers valid and invalid intake, workflow completeness, asset-to-step mapping, run start/progress/skip/back behavior, browser persistence and corrupt-state recovery, comparable-run measurement and deltas, version provenance, problem recording, revision gating, previous-version preservation, and server-rendered critical UI states. TypeScript strict mode, Vite production build, generated-package audits, schemas, and HTTP/bundle contract checks provide the remaining gates.
