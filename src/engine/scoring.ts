import type { Classification, StepScores, WorkflowStep } from "../types";

const clamp = (value: number) => Math.max(1, Math.min(5, Math.round(value)));

export function scoreStep(step: WorkflowStep, workflowMinutes: number): StepScores {
  const painText = `${step.description} ${step.painPoints.join(" ")}`.toLowerCase();
  const humanText = step.decisionsRequired.join(" ").toLowerCase();
  return {
    repetition: step.repeated ? 5 : 2,
    timeCost: clamp((step.estimatedMinutes / Math.max(workflowMinutes, 1)) * 12),
    cognitiveLoad: clamp(2 + step.decisionsRequired.length + step.painPoints.length / 2),
    errorRisk: clamp(1 + step.decisionsRequired.length + (/(accuracy|error|miss|wrong|confus)/.test(painText) ? 2 : 0)),
    automationSuitability: clamp(3 + (step.repeated ? 1 : 0) - step.decisionsRequired.length - (step.humanReviewMandatory ? 1 : 0)),
    // A required review is an approval boundary, not proof that AI cannot prepare
    // a draft. Multiple decisions or explicitly academic judgment still reach the
    // HUMAN_ONLY threshold; a single reviewable decision can remain AI_ASSIST.
    humanJudgment: clamp(1 + step.decisionsRequired.length * 2 + (step.humanReviewMandatory ? 1 : 0) + (/(academic|teaching|quality|appropriate)/.test(humanText) ? 1 : 0)),
  };
}

export function classifyStep(step: WorkflowStep, scores: StepScores): Classification {
  const text = `${step.description} ${step.painPoints.join(" ")}`.toLowerCase();
  if (/(duplicate|unnecessary|no longer needed|no clear purpose)/.test(text) && !step.humanReviewMandatory) return "ELIMINATE";
  if (scores.humanJudgment >= 5) return "HUMAN_ONLY";
  if (scores.humanJudgment >= 3 && scores.automationSuitability <= 3) return "AI_ASSIST";
  if (/(search|find|folder|organize|collect|gather)/.test(text)) return "STANDARDIZE";
  if (/(rewrite|recreate|draft|outline|format)/.test(text) && scores.repetition >= 4) return "TEMPLATE";
  if (scores.automationSuitability >= 4 && scores.repetition >= 4) return "AUTOMATE";
  if (scores.timeCost >= 4 || scores.cognitiveLoad >= 4) return "SIMPLIFY";
  return "STANDARDIZE";
}

export function opportunityScore(scores: StepScores): number {
  const gain = scores.repetition + scores.timeCost + scores.cognitiveLoad + scores.automationSuitability;
  const restraint = scores.errorRisk * 0.25 + scores.humanJudgment * 0.75;
  return Math.round((gain - restraint) * 10) / 10;
}
