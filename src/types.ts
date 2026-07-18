export const classifications = [
  "ELIMINATE", "SIMPLIFY", "STANDARDIZE", "TEMPLATE", "AUTOMATE", "AI_ASSIST", "HUMAN_ONLY",
] as const;
export type Classification = (typeof classifications)[number];

export interface WorkflowStep {
  id: string;
  order: number;
  description: string;
  tool: string;
  inputs: string[];
  output: string;
  estimatedMinutes: number;
  painPoints: string[];
  decisionsRequired: string[];
  repeated: boolean;
  humanReviewMandatory: boolean;
}

export interface WorkflowIntake {
  workflowName: string;
  userRole: string;
  objective: string;
  trigger: string;
  frequency: string;
  currentTimeMinutes: number;
  tools: string[];
  inputs: string[];
  desiredOutputs: string[];
  currentSteps: WorkflowStep[];
  majorFrustrations: string[];
  repeatedActions: string[];
  humanJudgmentRequired: string[];
  sensitiveInformation: string;
  successDefinition: string;
  desiredImprovement: string;
}

export interface StepScores {
  repetition: number;
  timeCost: number;
  cognitiveLoad: number;
  errorRisk: number;
  automationSuitability: number;
  humanJudgment: number;
}

export interface DiagnosedStep extends WorkflowStep {
  classification: Classification;
  scores: StepScores;
  opportunityScore: number;
  recommendation: string;
}

export interface ImprovedStep {
  order: number;
  title: string;
  input: string;
  action: string;
  tool: string;
  output: string;
  aiInvolvement: string;
  humanReview: string;
  estimatedMinutes: number;
  failureCondition: string;
  classification: Classification;
}

export interface WorkflowAsset {
  name: string;
  kind: "prompt" | "template" | "checklist";
  content: string;
}

export interface WorkflowPackage {
  version: string;
  generatedAt: string;
  metadata: Pick<WorkflowIntake, "workflowName" | "userRole" | "objective" | "frequency">;
  summary: string;
  baseline: { estimatedTimeMinutes: number; numberOfSteps: number; majorBottlenecks: number };
  diagnosis: DiagnosedStep[];
  priorityImprovements: DiagnosedStep[];
  improvedWorkflow: ImprovedStep[];
  assets: WorkflowAsset[];
  exampleExecution: {
    scenario: string;
    inputs: string[];
    outputs: string[];
    observations: string[];
  };
  riskNotes: string[];
  measurement: {
    baselineTimeMinutes: number;
    targetTimeMinutes: number;
    baselineStepCount: number;
    targetStepCount: number;
    qualityIndicators: string[];
    reviewQuestions: string[];
  };
}

export type FeedbackCategory = "accuracy" | "clarity" | "missing_input" | "tool_fit" | "time" | "other";

export interface WorkflowFeedback {
  failedStepOrder: number;
  category: FeedbackCategory;
  report: string;
  desiredOutcome: string;
  usefulnessRating: number;
  actualTimeMinutes: number | null;
  correctionCount: number;
}

export interface RevisionChange {
  field: "action" | "humanReview" | "failureCondition";
  before: string;
  after: string;
  rationale: string;
}

export interface WorkflowRevisionDraft {
  id: string;
  status: "pending_approval";
  createdAt: string;
  generator: "local-rule-based-prototype";
  originalVersion: string;
  feedback: WorkflowFeedback;
  proposedPackage: WorkflowPackage;
  changes: RevisionChange[];
}

export interface ApprovedWorkflowRevision {
  draftId: string;
  status: "approved";
  approvedAt: string;
  package: WorkflowPackage;
}
