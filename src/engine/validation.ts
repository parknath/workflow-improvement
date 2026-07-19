import type { WorkflowIntake } from "../types";

export interface ValidationResult { valid: boolean; errors: string[] }

export function validateIntakeStage(value: Partial<WorkflowIntake>, stage: number): string[] {
  const errors: string[] = [];
  const requireText = (key: keyof WorkflowIntake, label: string) => {
    if (!String(value[key] ?? "").trim()) errors.push(`${label} is required.`);
  };

  if (stage === 0) {
    requireText("userRole", "User role");
    requireText("workflowName", "Workflow name");
    requireText("objective", "Objective");
  }
  if (stage === 1) {
    requireText("trigger", "Trigger");
    requireText("frequency", "Frequency");
    if (!Number.isFinite(value.currentTimeMinutes) || (value.currentTimeMinutes ?? 0) <= 0) {
      errors.push("Current time must be greater than zero.");
    }
  }
  if (stage === 2) {
    if (!value.currentSteps?.length) errors.push("Add at least one current workflow step.");
    value.currentSteps?.forEach((step, index) => {
      if (!step.description.trim()) errors.push(`Step ${index + 1} needs a description.`);
      if (!step.tool.trim()) errors.push(`Step ${index + 1} needs a tool or location.`);
      if (!step.inputs.length) errors.push(`Step ${index + 1} needs at least one input.`);
      if (!step.output.trim()) errors.push(`Step ${index + 1} needs an output.`);
      if (step.estimatedMinutes <= 0) errors.push(`Step ${index + 1} needs a valid time estimate.`);
    });
  }
  if (stage === 3) {
    if (!value.tools?.length) errors.push("Add at least one tool currently used.");
    if (!value.inputs?.length) errors.push("Add at least one workflow input.");
    if (!value.desiredOutputs?.length) errors.push("Add at least one desired output.");
    if (!value.majorFrustrations?.length && !value.currentSteps?.some((step) => step.painPoints.length)) {
      errors.push("Describe at least one pain point or state that none are known.");
    }
  }
  if (stage === 4) {
    requireText("sensitiveInformation", "Sensitive-information consideration");
    requireText("successDefinition", "Success definition");
    requireText("desiredImprovement", "Desired improvement");
  }
  return errors;
}

export function validateIntake(value: Partial<WorkflowIntake>): ValidationResult {
  const errors = [0, 1, 2, 3, 4].flatMap((stage) => validateIntakeStage(value, stage));
  return { valid: errors.length === 0, errors };
}
