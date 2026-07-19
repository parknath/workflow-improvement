import { describe, expect, it } from "vitest";
import { lectureIntake } from "./data/fixtures";
import { generatePackage } from "./engine/generator";
import { approveWorkflowRevision, draftWorkflowRevision } from "./revision";
import type { WorkflowFeedback } from "./types";
import {
  applyApprovedPackage,
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
    expect(workspace.lastRunSummary).toMatchObject({ actualTotalMinutes: 58, usefulnessRating: 4, reuseIntent: "yes", workflowVersion: "0.1" });
    const nextRun = startWorkflowRun(workspace, new Date("2026-07-26T01:00:00.000Z"));
    expect(nextRun.lastRunSummary).toEqual(workspace.lastRunSummary);
    expect(nextRun.currentRun?.completedStepOrders).toEqual([]);
  });
});
