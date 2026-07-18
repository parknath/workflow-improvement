import type { WorkflowIntake, WorkflowPackage, WorkflowStep } from "./types";

const ordered = (steps: WorkflowStep[]) => steps.map((step, index) => ({ ...step, order: index + 1 }));

export function moveWorkflowStep(steps: WorkflowStep[], index: number, direction: -1 | 1): WorkflowStep[] {
  const nextIndex = index + direction;
  if (index < 0 || index >= steps.length || nextIndex < 0 || nextIndex >= steps.length) return steps;
  const next = [...steps];
  [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
  return ordered(next);
}

export function appendWorkflowStep(steps: WorkflowStep[], step: WorkflowStep): WorkflowStep[] {
  return ordered([...steps, step]);
}

export function removeWorkflowStep(steps: WorkflowStep[], id: string): WorkflowStep[] {
  return ordered(steps.filter((step) => step.id !== id));
}

export function serializeIntake(intake: WorkflowIntake): string {
  return JSON.stringify(intake, null, 2);
}

export function serializeWorkflowPackage(pkg: WorkflowPackage): string {
  return JSON.stringify(pkg, null, 2);
}

export function intakeDownloadName(workflowName: string): string {
  const slug = workflowName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `${slug || "workflow"}-intake.json`;
}

export function workflowPackageDownloadName(workflowName: string): string {
  const slug = workflowName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `${slug || "workflow"}-package.json`;
}
