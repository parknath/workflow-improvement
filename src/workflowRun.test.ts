import { describe, expect, it } from "vitest";
import { lectureIntake } from "./data/fixtures";
import { generatePackage } from "./engine/generator";
import { approveWorkflowRevision, draftWorkflowRevision } from "./revision";
import type { WorkflowFeedback } from "./types";
import {
  applyApprovedPackage,
  applyApprovedPackageForNextRun,
  compareWorkflowRuns,
  completeFirstRunMeasurement,
  completeWorkflowStep,
  createWorkflowWorkspace,
  endWorkflowRun,
  goToPreviousWorkflowStep,
  loadWorkflowWorkspace,
  recordWorkflowProblem,
  saveWorkflowWorkspace,
  skipWorkflowStep,
  startWorkflowRun,
  summarizeCompletedRun,
  updateRunMeasurement,
  validateFirstRunMeasurement,
  WORKSPACE_STORAGE_KEY,
} from "./workflowRun";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}

const feedback: WorkflowFeedback = {
  failedStepOrder: 2,
  category: "clarity",
  expectedOutcome: "A complete source manifest",
  actualOutcome: "The source list omitted two required readings",
  fitReason: "The instruction did not name the required sources",
  report: "The collection step appeared complete but two required readings were missing.",
  desiredOutcome: "",
  usefulnessRating: 3,
  actualTimeMinutes: 18,
  correctionCount: 1,
};

describe("browser-local workflow run", () => {
  it("starts, completes, skips, and revisits workflow steps", () => {
    const pkg = generatePackage(lectureIntake);
    let workspace = startWorkflowRun(createWorkflowWorkspace(pkg), new Date("2026-07-19T01:00:00.000Z"));
    expect(workspace.currentRun?.currentStepOrder).toBe(1);
    workspace = completeWorkflowStep(workspace);
    expect(workspace.currentRun?.completedStepOrders).toEqual([1]);
    expect(workspace.currentRun?.currentStepOrder).toBe(2);
    workspace = skipWorkflowStep(workspace);
    expect(workspace.currentRun?.skippedStepOrders).toEqual([2]);
    expect(workspace.currentRun?.currentStepOrder).toBe(3);
    workspace = goToPreviousWorkflowStep(workspace);
    expect(workspace.currentRun?.currentStepOrder).toBe(2);
  });

  it("persists the active package and in-progress run in browser storage", () => {
    const storage = memoryStorage();
    const workspace = completeWorkflowStep(startWorkflowRun(createWorkflowWorkspace(generatePackage(lectureIntake))));
    saveWorkflowWorkspace(storage, workspace);
    expect(storage.getItem(WORKSPACE_STORAGE_KEY)).toContain("completedStepOrders");
    expect(loadWorkflowWorkspace(storage)).toEqual(workspace);
    storage.setItem(WORKSPACE_STORAGE_KEY, "not json");
    expect(loadWorkflowWorkspace(storage)).toBeNull();
    expect(storage.getItem(WORKSPACE_STORAGE_KEY)).toBeNull();
  });

  it("records a problem and keeps the active version unchanged until approval", () => {
    let workspace = startWorkflowRun(createWorkflowWorkspace(generatePackage(lectureIntake)));
    workspace = recordWorkflowProblem(workspace, feedback, new Date("2026-07-19T01:10:00.000Z"));
    expect(workspace.currentRun?.problems).toHaveLength(1);
    const draft = draftWorkflowRevision(workspace.activePackage, feedback);
    expect(workspace.activePackage.version).toBe("0.1");
    const approved = approveWorkflowRevision(draft);
    workspace = applyApprovedPackage({ ...workspace, pendingRevision: draft }, approved.package);
    expect(workspace.activePackage.version).toBe("0.2");
    expect(workspace.previousPackage?.version).toBe("0.1");
    expect(workspace.pendingRevision).toBeNull();
  });

  it("validates and saves a measured first-run baseline for reuse", () => {
    let workspace = startWorkflowRun(createWorkflowWorkspace(generatePackage(lectureIntake)), new Date("2026-07-19T01:00:00.000Z"));
    workspace = endWorkflowRun(workspace, new Date("2026-07-19T02:00:00.000Z"));
    expect(workspace.currentRun?.measurement.actualTotalMinutes).toBe(60);
    expect(validateFirstRunMeasurement(workspace.currentRun!.measurement).length).toBeGreaterThan(3);
    workspace = updateRunMeasurement(workspace, {
      taskCompleted: true,
      actualTotalMinutes: 58,
      usefulnessRating: 4,
      correctionCount: 2,
      mostUsefulAsset: "Lecture brief template",
      leastUsefulStepOrder: 5,
      reuseIntent: "yes",
      nextChange: "Clarify the lesson-structure step.",
    });
    workspace = completeFirstRunMeasurement(workspace, new Date("2026-07-19T02:03:00.000Z"));
    expect(workspace.currentRun?.status).toBe("completed");
    expect(workspace.lastRunSummary).toBeNull();
    expect(summarizeCompletedRun(workspace)).toMatchObject({ actualTotalMinutes: 58, usefulnessRating: 4, reuseIntent: "yes", workflowVersion: "0.1" });
    const nextRun = startWorkflowRun(workspace, new Date("2026-07-26T01:00:00.000Z"));
    expect(nextRun.lastRunSummary).toEqual(summarizeCompletedRun(workspace));
    expect(nextRun.currentRun?.completedStepOrders).toEqual([]);
  });

  it("keeps one prior run as the baseline and compares it with the completed next run", () => {
    let workspace = startWorkflowRun(createWorkflowWorkspace(generatePackage(lectureIntake)), new Date("2026-07-19T01:00:00.000Z"));
    workspace = endWorkflowRun(workspace, new Date("2026-07-19T02:00:00.000Z"));
    workspace = updateRunMeasurement(workspace, { taskCompleted: true, actualTotalMinutes: 60, usefulnessRating: 3, correctionCount: 2, mostUsefulAsset: "Lecture brief template", leastUsefulStepOrder: 5, reuseIntent: "yes", nextChange: "Clarify the lesson structure." });
    workspace = completeFirstRunMeasurement(workspace, new Date("2026-07-19T02:03:00.000Z"));
    workspace = startWorkflowRun(workspace, new Date("2026-07-26T01:00:00.000Z"));
    const baseline = workspace.lastRunSummary!;
    workspace = endWorkflowRun(workspace, new Date("2026-07-26T01:50:00.000Z"));
    workspace = updateRunMeasurement(workspace, { taskCompleted: true, actualTotalMinutes: 50, usefulnessRating: 4, correctionCount: 1, mostUsefulAsset: "Lecture brief template", leastUsefulStepOrder: 4, reuseIntent: "yes", nextChange: "Test the source check again." });
    workspace = completeFirstRunMeasurement(workspace, new Date("2026-07-26T01:52:00.000Z"));
    const current = summarizeCompletedRun(workspace)!;
    expect(workspace.lastRunSummary).toEqual(baseline);
    expect(compareWorkflowRuns(baseline, current)).toMatchObject({ timeDeltaMinutes: -10, usefulnessDelta: 1, correctionDelta: -1, baselineTaskCompleted: true, currentTaskCompleted: true });
  });

  it("keeps the run's starting version when an approved revision becomes active", () => {
    let workspace = startWorkflowRun(createWorkflowWorkspace(generatePackage(lectureIntake)));
    const approved = approveWorkflowRevision(draftWorkflowRevision(workspace.activePackage, feedback));
    workspace = applyApprovedPackage(workspace, approved.package);
    expect(workspace.activePackage.version).toBe("0.2");
    expect(workspace.currentRun?.workflowVersion).toBe("0.1");
  });

  it("ends the affected run for measurement and applies an approved version to the next run", () => {
    let workspace = startWorkflowRun(createWorkflowWorkspace(generatePackage(lectureIntake)), new Date("2026-07-19T01:00:00.000Z"));
    const approved = approveWorkflowRevision(draftWorkflowRevision(workspace.activePackage, feedback));
    workspace = applyApprovedPackageForNextRun(workspace, approved.package, new Date("2026-07-19T01:18:00.000Z"));
    expect(workspace.activePackage.version).toBe("0.2");
    expect(workspace.currentRun).toMatchObject({ status: "measuring", workflowVersion: "0.1", endedAt: "2026-07-19T01:18:00.000Z" });
    workspace = updateRunMeasurement(workspace, { taskCompleted: false, actualTotalMinutes: 18, usefulnessRating: 3, correctionCount: 1, mostUsefulAsset: "Lecture brief template", leastUsefulStepOrder: 2, reuseIntent: "yes", nextChange: "Use the approved source check." });
    workspace = completeFirstRunMeasurement(workspace, new Date("2026-07-19T01:20:00.000Z"));
    workspace = startWorkflowRun(workspace, new Date("2026-07-26T01:00:00.000Z"));
    expect(workspace.lastRunSummary?.workflowVersion).toBe("0.1");
    expect(workspace.currentRun?.workflowVersion).toBe("0.2");
  });
});
