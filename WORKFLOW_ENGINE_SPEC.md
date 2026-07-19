# Workflow engine specification

## Input contract

The engine accepts one workflow with name, role, objective, trigger, frequency, baseline time, tools, inputs, desired outputs, ordered current steps, frustrations, repeated actions, judgment requirements, sensitive-information considerations, success definition, and desired improvement. Each step includes ID, order, description, tool, inputs, output, minutes, pain points, decisions, repetition, and mandatory-review status.

## Pipeline

1. Validate the structured intake and reject missing executable information.
2. Map the current workflow using the ordered steps and baseline.
3. Score each step from one to five for repetition, time cost, cognitive load, error risk, automation suitability, and human judgment.
4. Assign one primary classification: `ELIMINATE`, `SIMPLIFY`, `STANDARDIZE`, `TEMPLATE`, `AUTOMATE`, `AI_ASSIST`, or `HUMAN_ONLY`. A mandatory human review is an approval boundary, not an automatic `HUMAN_ONLY` classification: a reviewable first draft may be `AI_ASSIST`, while multi-decision or high-judgment academic choices remain `HUMAN_ONLY`.
5. Rank opportunities using expected gain reduced by error and judgment restraint.
6. Generate an executable redesign, assets, review points, privacy notes, example execution, and measurement plan.
7. Render the package as JSON and nine Markdown files.

## Guardrails

Technical automability alone never overrides risk or judgment. High-judgment steps remain human-only or AI-assisted with named review. Academic claims, teaching decisions, personal capacity, student-level fit, and final approval are human responsibilities. Unapproved AI tools must not receive confidential, institution-restricted, or identifiable student information.

## Measurement

The package reports the user-provided baseline and a clearly labeled prototype target. Real evaluation records actual step time, corrections, completion quality, user effort, and whether the workflow can be repeated without operator help.
