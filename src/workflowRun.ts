import type {
  FirstRunMeasurement,
  ReportedWorkflowProblem,
  WorkflowFeedback,
  WorkflowPackage,
  WorkflowRunState,
  WorkflowRunSummary,
  WorkflowWorkspace,
} from "./types";

export const WORKSPACE_STORAGE_KEY = "workflow-lab-active-workflow";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export const emptyMeasurement = (): FirstRunMeasurement => ({
  taskCompleted: null,
  actualTotalMinutes: null,
  usefulnessRating: 0,
  correctionCount: 0,
  mostUsefulAsset: "",
  leastUsefulStepOrder: null,
  reuseIntent: "",
  nextChange: "",
});

export function createWorkflowWorkspace(pkg: WorkflowPackage): WorkflowWorkspace {
  return {
    activePackage: structuredClone(pkg),
    previousPackage: null,
    currentRun: null,
    lastRunSummary: null,
    pendingRevision: null,
  };
}

export function startWorkflowRun(workspace: WorkflowWorkspace, now = new Date()): WorkflowWorkspace {
  const firstStep = workspace.activePackage.improvedWorkflow[0];
  if (!firstStep) throw new Error("This workflow has no executable steps.");
  const completedRun = summarizeCompletedRun(workspace);
  return {
    ...workspace,
    lastRunSummary: completedRun ?? workspace.lastRunSummary,
    pendingRevision: null,
    currentRun: {
      id: `run-${now.getTime()}`,
      workflowVersion: workspace.activePackage.version,
      status: "running",
      currentStepOrder: firstStep.order,
      completedStepOrders: [],
      skippedStepOrders: [],
      startedAt: now.toISOString(),
      endedAt: null,
      problems: [],
      measurement: emptyMeasurement(),
    },
  };
}

function updateCurrentRun(workspace: WorkflowWorkspace, update: (run: WorkflowRunState) => WorkflowRunState): WorkflowWorkspace {
  if (!workspace.currentRun) throw new Error("Start the workflow before updating its run.");
  return { ...workspace, currentRun: update(workspace.currentRun) };
}

function nextStepOrder(pkg: WorkflowPackage, order: number): number | null {
  const index = pkg.improvedWorkflow.findIndex((step) => step.order === order);
  return pkg.improvedWorkflow[index + 1]?.order ?? null;
}

export function completeWorkflowStep(workspace: WorkflowWorkspace): WorkflowWorkspace {
  return updateCurrentRun(workspace, (run) => {
    const completed = Array.from(new Set([...run.completedStepOrders, run.currentStepOrder]));
    const skipped = run.skippedStepOrders.filter((order) => order !== run.currentStepOrder);
    const next = nextStepOrder(workspace.activePackage, run.currentStepOrder);
    return next === null
      ? { ...run, completedStepOrders: completed, skippedStepOrders: skipped, status: "measuring" }
      : { ...run, completedStepOrders: completed, skippedStepOrders: skipped, currentStepOrder: next };
  });
}

export function skipWorkflowStep(workspace: WorkflowWorkspace): WorkflowWorkspace {
  return updateCurrentRun(workspace, (run) => {
    const skipped = Array.from(new Set([...run.skippedStepOrders, run.currentStepOrder]));
    const completed = run.completedStepOrders.filter((order) => order !== run.currentStepOrder);
    const next = nextStepOrder(workspace.activePackage, run.currentStepOrder);
    return next === null
      ? { ...run, completedStepOrders: completed, skippedStepOrders: skipped, status: "measuring" }
      : { ...run, completedStepOrders: completed, skippedStepOrders: skipped, currentStepOrder: next };
  });
}

export function goToPreviousWorkflowStep(workspace: WorkflowWorkspace): WorkflowWorkspace {
  return updateCurrentRun(workspace, (run) => {
    const index = workspace.activePackage.improvedWorkflow.findIndex((step) => step.order === run.currentStepOrder);
    const previous = workspace.activePackage.improvedWorkflow[index - 1];
    return previous ? { ...run, status: "running", currentStepOrder: previous.order } : run;
  });
}

export function endWorkflowRun(workspace: WorkflowWorkspace, now = new Date()): WorkflowWorkspace {
  return updateCurrentRun(workspace, (run) => {
    const elapsed = Math.max(1, Math.round((now.getTime() - new Date(run.startedAt).getTime()) / 60000));
    return {
      ...run,
      status: "measuring",
      endedAt: now.toISOString(),
      measurement: { ...run.measurement, actualTotalMinutes: run.measurement.actualTotalMinutes ?? elapsed },
    };
  });
}

export function updateRunMeasurement(workspace: WorkflowWorkspace, measurement: FirstRunMeasurement): WorkflowWorkspace {
  return updateCurrentRun(workspace, (run) => ({ ...run, measurement: structuredClone(measurement) }));
}

export function validateFirstRunMeasurement(measurement: FirstRunMeasurement): string[] {
  const errors: string[] = [];
  if (measurement.taskCompleted === null) errors.push("Say whether the task was completed.");
  if (!Number.isFinite(measurement.actualTotalMinutes) || (measurement.actualTotalMinutes ?? 0) < 1) errors.push("Enter the actual total time in minutes.");
  if (!Number.isInteger(measurement.usefulnessRating) || measurement.usefulnessRating < 1 || measurement.usefulnessRating > 5) errors.push("Rate usefulness from 1 to 5.");
  if (!Number.isInteger(measurement.correctionCount) || measurement.correctionCount < 0) errors.push("Correction count must be zero or more.");
  if (!measurement.mostUsefulAsset.trim()) errors.push("Choose the most useful reusable asset, or choose none.");
  if (measurement.leastUsefulStepOrder === null) errors.push("Choose the least useful or most confusing step.");
  if (!measurement.reuseIntent) errors.push("Say whether you expect to use this workflow again.");
  if (measurement.nextChange.trim().length < 5) errors.push("Describe one change for the next run in at least 5 characters.");
  return errors;
}

export function completeFirstRunMeasurement(workspace: WorkflowWorkspace, now = new Date()): WorkflowWorkspace {
  if (!workspace.currentRun) throw new Error("There is no workflow run to measure.");
  const errors = validateFirstRunMeasurement(workspace.currentRun.measurement);
  if (errors.length) throw new Error(errors.join("\n"));
  const run = workspace.currentRun;
  const completedAt = now.toISOString();
  return {
    ...workspace,
    currentRun: { ...run, status: "completed", endedAt: completedAt },
  };
}

export function summarizeCompletedRun(workspace: WorkflowWorkspace): WorkflowRunSummary | null {
  const run = workspace.currentRun;
  if (!run || run.status !== "completed" || !run.endedAt) return null;
  return {
    ...structuredClone(run.measurement),
    runId: run.id,
    workflowName: workspace.activePackage.metadata.workflowName,
    workflowVersion: run.workflowVersion,
    startedAt: run.startedAt,
    completedAt: run.endedAt,
    completedStepOrders: [...run.completedStepOrders],
    skippedStepOrders: [...run.skippedStepOrders],
    problemsReported: run.problems.length,
  };
}

export function compareWorkflowRuns(baseline: WorkflowRunSummary, current: WorkflowRunSummary) {
  return {
    baselineRunId: baseline.runId,
    currentRunId: current.runId,
    workflowVersionChange: `${baseline.workflowVersion} -> ${current.workflowVersion}`,
    timeDeltaMinutes: (current.actualTotalMinutes ?? 0) - (baseline.actualTotalMinutes ?? 0),
    usefulnessDelta: current.usefulnessRating - baseline.usefulnessRating,
    correctionDelta: current.correctionCount - baseline.correctionCount,
    baselineTaskCompleted: baseline.taskCompleted,
    currentTaskCompleted: current.taskCompleted,
  };
}

export function recordWorkflowProblem(workspace: WorkflowWorkspace, feedback: WorkflowFeedback, now = new Date()): WorkflowWorkspace {
  const problem: ReportedWorkflowProblem = {
    ...structuredClone(feedback),
    id: `problem-${now.getTime()}-step-${feedback.failedStepOrder}`,
    reportedAt: now.toISOString(),
  };
  return updateCurrentRun(workspace, (run) => ({ ...run, problems: [...run.problems, problem] }));
}

export function applyApprovedPackage(workspace: WorkflowWorkspace, pkg: WorkflowPackage): WorkflowWorkspace {
  return {
    ...workspace,
    previousPackage: structuredClone(workspace.activePackage),
    activePackage: structuredClone(pkg),
    pendingRevision: null,
    currentRun: workspace.currentRun,
  };
}

export function applyApprovedPackageForNextRun(workspace: WorkflowWorkspace, pkg: WorkflowPackage, now = new Date()): WorkflowWorkspace {
  return endWorkflowRun(applyApprovedPackage(workspace, pkg), now);
}

export function serializeRunSummary(summary: WorkflowRunSummary): string {
  return JSON.stringify(summary, null, 2);
}

export function serializeRunEvidence(current: WorkflowRunSummary, baseline: WorkflowRunSummary | null): string {
  return JSON.stringify({
    currentRun: current,
    priorComparableRun: baseline,
    comparison: baseline ? compareWorkflowRuns(baseline, current) : null,
    interpretation: baseline
      ? "Observed differences between two runs; this does not prove that Workflow Lab caused the change."
      : "First measured run; a comparable prior run is not yet available.",
  }, null, 2);
}

function isWorkspace(value: unknown): value is WorkflowWorkspace {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<WorkflowWorkspace>;
  return Boolean(candidate.activePackage?.metadata?.workflowName && Array.isArray(candidate.activePackage.improvedWorkflow));
}

export function loadWorkflowWorkspace(storage: StorageLike): WorkflowWorkspace | null {
  try {
    const raw = storage.getItem(WORKSPACE_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isWorkspace(parsed)) throw new Error("Stored workflow is incomplete.");
    return parsed;
  } catch {
    try { storage.removeItem(WORKSPACE_STORAGE_KEY); } catch { /* Keep the browser usable when storage is unavailable. */ }
    return null;
  }
}

export function saveWorkflowWorkspace(storage: StorageLike, workspace: WorkflowWorkspace): void {
  storage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(workspace));
}
