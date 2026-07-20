# MVP scope

## Included

- Responsive public prototype with six routes.
- Workflow library with two complete education templates and four future concepts.
- Fixture-based interactive diagnosis demo.
- Preset-first confirmation plus optional six-step intake with add, edit, reorder, and remove step controls.
- Browser-only intake and active-workflow persistence, intake JSON export, in-browser workflow generation, action-first presentation, and workflow JSON export.
- One-step-at-a-time guided run with complete, skip, back, problem, save/exit, and end-run controls.
- Step-linked reusable assets with purpose, copy behavior, human verification, and prohibited-use guidance.
- Browser-local measurement, one-prior-run comparison, and copyable/downloadable evidence without adding retained history.
- Browser-local problem capture, one-step correction drafting, side-by-side review, explicit approval before active-version replacement, and one immediately previous approved version.
- JSON Schema and TypeScript intake model.
- Deterministic validation, scoring, classification, diagnosis, redesign, assets, safety controls, example execution, and measurement plan.
- Local CLI that generates a JSON package and nine Markdown deliverables.
- Complete professor lecture-preparation and student weekly-planning fixtures.
- Realistic professor sample-result experience.

## Explicitly excluded

Authentication, accounts, real payments, databases, external AI APIs, server or cross-device history, durable complaint storage, email, analytics, cloud storage, Google Drive, calendars, LMS integrations, collaboration, autonomous grading, autonomous computer control, mobile apps, and production SaaS operations. The intended business model is a subscription, but this prototype does not implement subscription behavior.

## Prototype success gate

All routes work locally; intake exports valid JSON; both fixtures validate; both workflows generate; guided-run progress and measurement survive a refresh; the active version cannot change without approval; tests, type checking, and production build pass; documentation explains operation and extension; all estimates remain clearly labeled.
