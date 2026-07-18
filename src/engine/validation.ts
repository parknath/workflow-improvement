import type { WorkflowIntake } from "../types";

export interface ValidationResult { valid: boolean; errors: string[] }

export function validateIntake(value: Partial<WorkflowIntake>): ValidationResult {
  const errors: string[] = [];
  const required: Array<[keyof WorkflowIntake, string]> = [
    ["workflowName", "Workflow name"], ["userRole", "User role"], ["objective", "Objective"],
    ["trigger", "Trigger"], ["frequency", "Frequency"], ["sensitiveInformation", "Sensitive-information consideration"],
    ["successDefinition", "Success definition"], ["desiredImprovement", "Desired improvement"],
  ];
  for (const [key, label] of required) {
    if (!String(value[key] ?? "").trim()) errors.push(`${label} is required.`);
  }
  if (!Number.isFinite(value.currentTimeMinutes) || (value.currentTimeMinutes ?? 0) <= 0) {
    errors.push("Current time must be greater than zero.");
  }
  if (!value.currentSteps?.length) errors.push("Add at least one current workflow step.");
  if (!value.inputs?.length) errors.push("Add at least one workflow input.");
  if (!value.desiredOutputs?.length) errors.push("Add at least one desired output.");
  if (!value.tools?.length) errors.push("Add at least one tool currently used.");
  if (!value.majorFrustrations?.length && !value.currentSteps?.some((step) => step.painPoints.length)) {
    errors.push("Describe at least one pain point or state that none are known.");
  }
  value.currentSteps?.forEach((step, index) => {
    if (!step.description.trim()) errors.push(`Step ${index + 1} needs a description.`);
    if (!step.tool.trim()) errors.push(`Step ${index + 1} needs a tool or location.`);
    if (!step.inputs.length) errors.push(`Step ${index + 1} needs at least one input.`);
    if (!step.output.trim()) errors.push(`Step ${index + 1} needs an output.`);
    if (step.estimatedMinutes <= 0) errors.push(`Step ${index + 1} needs a valid time estimate.`);
  });
  return { valid: errors.length === 0, errors };
}
