# Technical specification

## Stack

React 19, TypeScript, Vite, Vitest, and Lucide icons. The project has no runtime service, database, API key, router dependency, or state-management dependency.

## Runtime model

The browser application uses History API routing for the six prototype routes. Intake state is React state mirrored to `localStorage`; submission performs the same local validation used by the engine and downloads a JSON file through a temporary object URL. No user data leaves the browser.

The CLI selects a fixture, validates it, computes step scores and classifications, generates a package, and writes structured JSON plus Markdown files to `generated/<workflow-slug>/`.

## Extension points

- Add workflow-specific redesigned blueprints and assets in `src/engine/generator.ts`.
- Add fixture intake data and library cards in `src/data/fixtures.ts`.
- Add an LLM provider later behind a new interface that accepts validated, privacy-filtered inputs and returns structured drafts. Deterministic generation remains the fallback.
- Add schema validation with a JSON Schema library if exported files later enter a server-side pipeline.

## Error and safety behavior

Invalid intake never reaches package generation. The UI shows validation errors on review. Corrupt browser state is discarded safely. Every improved step includes review and stop/escalation conditions. AI-assisted content is limited to supplied material and requires human review.

## Verification

Vitest covers valid and invalid intake, one-to-five scoring bounds, professor and student workflow completeness, executable step fields, Markdown file count, and target-time behavior. TypeScript strict mode and Vite production build provide compile and bundling gates.
