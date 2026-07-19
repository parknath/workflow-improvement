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
  stepOrders: number[];
  purpose: string;
  humanVerification: string;
  prohibitedUse: string;
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
  expectedOutcome: string;
  actualOutcome: string;
  fitReason: string;
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

export type WorkflowRunStatus = "running" | "measuring" | "completed";
export type ReuseIntent = "" | "yes" | "maybe" | "no";

export interface FirstRunMeasurement {
  taskCompleted: boolean | null;
  actualTotalMinutes: number | null;
  usefulnessRating: number;
  correctionCount: number;
  mostUsefulAsset: string;
  leastUsefulStepOrder: number | null;
  reuseIntent: ReuseIntent;
  nextChange: string;
}

export interface ReportedWorkflowProblem extends WorkflowFeedback {
  id: string;
  reportedAt: string;
}

export interface WorkflowRunState {
  id: string;
  workflowVersion: string;
  status: WorkflowRunStatus;
  currentStepOrder: number;
  completedStepOrders: number[];
  skippedStepOrders: number[];
  startedAt: string;
  endedAt: string | null;
  problems: ReportedWorkflowProblem[];
  measurement: FirstRunMeasurement;
}

export interface WorkflowRunSummary extends FirstRunMeasurement {
  runId: string;
  workflowName: string;
  workflowVersion: string;
  startedAt: string;
  completedAt: string;
  completedStepOrders: number[];
  skippedStepOrders: number[];
  problemsReported: number;
}

export interface WorkflowWorkspace {
  activePackage: WorkflowPackage;
  previousPackage: WorkflowPackage | null;
  currentRun: WorkflowRunState | null;
  lastRunSummary: WorkflowRunSummary | null;
  pendingRevision: WorkflowRevisionDraft | null;
}
