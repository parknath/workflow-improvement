# Website specification

## Direction

The experience should feel calm and immediately usable: generous whitespace, system typography, neutral surfaces, one blue action color, clear choices, and restrained motion. The first screen is the product selection experience, not a marketing explanation. It avoids robot imagery, excessive gradients, automation-at-all-costs language, chat-first interaction, and dense dashboards.

## Routes

- `/`: three common ready-made professor improvements, a separate custom-workflow escape hatch, saved-draft continuation, concise method, and browser-only privacy boundary.
- `/how-it-works`: capture, diagnose, redesign, implement, and measure method plus classifications.
- `/workflows`: ready-made and future workflow cards; lecture preparation, assignment redesign, course-material organization, and weekly planning are usable presets.
- `/demo`: role/workflow selector with fixture-generated baseline, bottlenecks, priorities, redesign, estimate, and review points.
- `/intake`: short ready-made workflow confirmation, action-first generated result, browser-local guided workflow run, contextual reusable assets, first-run measurement, human-approved revision, active/previous version handling, plus an optional six-step detailed intake and JSON downloads.
- `/sample-result`: complete professor result across overview, diagnosis, redesigned workflow, assets, and measurement.

## Accessibility and responsiveness

Use semantic landmarks, real buttons and form controls, visible keyboard focus, labeled fields, alert semantics for errors, accessible navigation controls, sufficient color contrast, touch-friendly targets, reduced-motion respect, mobile navigation, and layouts that collapse cleanly below tablet and phone breakpoints.

The guided run presents one step at a time with progress, complete, skip, back, problem-report, save/exit, and end-run controls. Status updates use live status semantics. Asset limits and human verification remain available without crowding the primary action.

## Content rules

The working name and primary homepage copy live in `src/config.ts`. Any time-reduction figure is labeled as a prototype estimate and paired with a measurement plan. Human responsibility and privacy boundaries remain visible throughout the experience.

The generated result leads with the active version, objective, immediate next action, and **Start workflow**. Diagnosis, the complete sequence, all assets, measurement guidance, and downloads remain available through progressive disclosure. Recurring-value copy may invite a comparable next run but must not claim an improvement until measured evidence supports it.
