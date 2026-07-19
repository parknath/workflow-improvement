import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { lectureIntake } from "./data/fixtures";
import { generatePackage } from "./engine/generator";
import { draftWorkflowRevision } from "./revision";
import { GeneratedWorkflowExperience } from "./WorkflowExperience";
import { completeFirstRunMeasurement, createWorkflowWorkspace, endWorkflowRun, startWorkflowRun, updateRunMeasurement } from "./workflowRun";
import type { WorkflowFeedback, WorkflowWorkspace } from "./types";

const render = (workspace: WorkflowWorkspace) => renderToStaticMarkup(<GeneratedWorkflowExperience
  workspace={workspace}
  setWorkspace={() => undefined}
  storageWarning=""
  downloadPackage={() => undefined}
  downloadIntake={() => undefined}
  reviseIntake={() => undefined}
/>);

describe("guided workflow experience", () => {
  it("leads the generated result with the next action and recurring improvement loop", () => {
    const html = render(createWorkflowWorkspace(generatePackage(lectureIntake)));
    expect(html).toContain("Start workflow");
    expect(html).toContain("Immediate next action");
    expect(html).toContain("Run it");
    expect(html).toContain("Measure it");
    expect(html).toContain("Improve it");
    expect(html).toContain("does not operate external tools");
  });

  it("renders a focused active step with its reusable asset and controls", () => {
    const html = render(startWorkflowRun(createWorkflowWorkspace(generatePackage(lectureIntake))));
    expect(html).toContain("Step 1 of 11");
    expect(html).toContain("Do this now");
    expect(html).toContain("Session folder structure");
    expect(html).toContain("Report a problem");
    expect(html).toContain("Complete step");
  });

  it("renders the measured-result form and completed baseline summary", () => {
    let workspace = endWorkflowRun(startWorkflowRun(createWorkflowWorkspace(generatePackage(lectureIntake))));
    expect(render(workspace)).toContain("What actually happened?");
    workspace = updateRunMeasurement(workspace, { taskCompleted: true, actualTotalMinutes: 61, usefulnessRating: 4, correctionCount: 1, mostUsefulAsset: "Session folder structure", leastUsefulStepOrder: 5, reuseIntent: "yes", nextChange: "Clarify the sequence." });
    workspace = completeFirstRunMeasurement(workspace);
    const html = render(workspace);
    expect(html).toContain("Your first result is now a baseline.");
    expect(html).toContain("Why use it again?");
    expect(html).toContain("Start next run");
  });

  it("shows a pending revision without replacing the active version", () => {
    let workspace = startWorkflowRun(createWorkflowWorkspace(generatePackage(lectureIntake)));
    const feedback: WorkflowFeedback = { failedStepOrder: 1, category: "clarity", expectedOutcome: "A named session workspace", actualOutcome: "The folder name was inconsistent", fitReason: "The naming rule was not specific enough", report: "The step left the folder naming pattern open to interpretation.", desiredOutcome: "", usefulnessRating: 3, actualTimeMinutes: 9, correctionCount: 1 };
    const draft = draftWorkflowRevision(workspace.activePackage, feedback);
    workspace = { ...workspace, pendingRevision: draft };
    const html = render(workspace);
    expect(html).toContain("Active v0.1 remains unchanged");
    expect(html).toContain("DRAFT REVISION 0.2");
    expect(html).toContain("Approve and make active");
  });
});
