import type {
  ApprovedWorkflowRevision,
  FeedbackCategory,
  RevisionChange,
  WorkflowFeedback,
  WorkflowPackage,
  WorkflowRevisionDraft,
} from "./types";

const correctionStrategies: Record<FeedbackCategory, { action: string; review: string; stop: string }> = {
  accuracy: {
    action: "Add a source-verification pass that traces every claim or calculation to an approved input and marks unsupported content [VERIFY].",
    review: "The accountable reviewer checks every corrected claim against the approved source before use.",
    stop: "Keep the current approved step if any corrected claim cannot be verified from an approved source.",
  },
  clarity: {
    action: "Rewrite the step as one observable action with a named input, output, and definition of done before running it again.",
    review: "The accountable reviewer confirms that another person could follow the corrected instruction without extra explanation.",
    stop: "Keep the current approved step if the corrected instruction still depends on unstated context.",
  },
  missing_input: {
    action: "Add a preflight checklist for required inputs, owners, and locations before starting this step.",
    review: "The accountable reviewer confirms every required input is present, current, and permitted for the selected tool.",
    stop: "Keep the current approved step and pause the run if any required input is missing or restricted.",
  },
  tool_fit: {
    action: "Replace the tool-dependent instruction with a tool-neutral action and name an institution-approved fallback.",
    review: "The accountable reviewer confirms the selected tool is approved and can produce the required output without exposing restricted information.",
    stop: "Keep the current approved step if no approved tool or manual fallback can satisfy the requirement.",
  },
  time: {
    action: "Split the step into a short first pass and a separate review pass, then record actual minutes for both parts.",
    review: "The accountable reviewer confirms the shorter sequence preserves the required quality and academic judgment.",
    stop: "Keep the current approved step if the shorter sequence removes a required check or produces an incomplete output.",
  },
  other: {
    action: "Add a preflight checkpoint that tests the reported failure condition before the step can continue.",
    review: "The accountable reviewer confirms the correction resolves the reported need without weakening existing safeguards.",
    stop: "Keep the current approved step if the reported need is not resolved in a low-risk trial.",
  },
};

export function validateWorkflowFeedback(feedback: WorkflowFeedback, pkg: WorkflowPackage): string[] {
  const errors: string[] = [];
  if (!pkg.improvedWorkflow.some((step) => step.order === feedback.failedStepOrder)) errors.push("Choose a workflow step that exists in the active package.");
  if (!Number.isInteger(feedback.usefulnessRating) || feedback.usefulnessRating < 1 || feedback.usefulnessRating > 5) errors.push("Usefulness must be rated from 1 to 5.");
  if (feedback.report.trim().length < 20) errors.push("Describe what failed in at least 20 characters.");
  if (feedback.desiredOutcome.trim().length < 12) errors.push("Describe the needed correction in at least 12 characters.");
  if (feedback.actualTimeMinutes !== null && (!Number.isFinite(feedback.actualTimeMinutes) || feedback.actualTimeMinutes < 1)) errors.push("Actual time must be a positive number when provided.");
  if (!Number.isInteger(feedback.correctionCount) || feedback.correctionCount < 0) errors.push("Correction count must be zero or more.");
  return errors;
}

function nextVersion(version: string): string {
  const match = version.match(/^(\d+)\.(\d+)$/);
  return match ? `${match[1]}.${Number(match[2]) + 1}` : `${version}-revision`;
}

export function draftWorkflowRevision(pkg: WorkflowPackage, feedback: WorkflowFeedback, now = new Date()): WorkflowRevisionDraft {
  const errors = validateWorkflowFeedback(feedback, pkg);
  if (errors.length) throw new Error(errors.join("\n"));

  const proposedPackage = structuredClone(pkg);
  const step = proposedPackage.improvedWorkflow.find((item) => item.order === feedback.failedStepOrder);
  if (!step) throw new Error("The selected workflow step no longer exists.");
  const strategy = correctionStrategies[feedback.category];
  const changes: RevisionChange[] = [
    {
      field: "action",
      before: step.action,
      after: `${step.action} Correction draft: ${strategy.action}`,
      rationale: `Responds to the reported ${feedback.category.replace("_", " ")} failure without changing another step.`,
    },
    {
      field: "humanReview",
      before: step.humanReview,
      after: `${step.humanReview} ${strategy.review} Approval target: ${feedback.desiredOutcome.trim()}`,
      rationale: "Makes acceptance of the correction an explicit human decision.",
    },
    {
      field: "failureCondition",
      before: step.failureCondition,
      after: `${step.failureCondition} ${strategy.stop}`,
      rationale: "Preserves the active workflow when the draft correction cannot be verified safely.",
    },
  ];

  for (const change of changes) step[change.field] = change.after;
  proposedPackage.version = nextVersion(pkg.version);
  proposedPackage.generatedAt = now.toISOString();
  proposedPackage.summary = `${pkg.summary} Revision ${proposedPackage.version} proposes one correction to step ${step.order}: ${step.title}. It does not replace the active package until a person approves it.`;

  return {
    id: `revision-${now.getTime()}-step-${step.order}`,
    status: "pending_approval",
    createdAt: now.toISOString(),
    generator: "local-rule-based-prototype",
    originalVersion: pkg.version,
    feedback: structuredClone(feedback),
    proposedPackage,
    changes,
  };
}

export function approveWorkflowRevision(draft: WorkflowRevisionDraft, now = new Date()): ApprovedWorkflowRevision {
  const approvedPackage = structuredClone(draft.proposedPackage);
  approvedPackage.summary = approvedPackage.summary.replace(
    "It does not replace the active package until a person approves it.",
    "A person reviewed and approved this correction before it replaced the prior package.",
  );
  return {
    draftId: draft.id,
    status: "approved",
    approvedAt: now.toISOString(),
    package: approvedPackage,
  };
}
