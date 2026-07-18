import { describe, expect, it } from "vitest";
import { lectureIntake } from "./data/fixtures";
import { generatePackage } from "./engine/generator";
import { approveWorkflowRevision, draftWorkflowRevision, validateWorkflowFeedback } from "./revision";
import type { WorkflowFeedback } from "./types";

const validFeedback: WorkflowFeedback = {
  failedStepOrder: 3,
  category: "accuracy",
  report: "The first draft included two claims that were not supported by the approved chapter.",
  desiredOutcome: "Every academic claim traces to an approved source.",
  usefulnessRating: 3,
  actualTimeMinutes: 27,
  correctionCount: 2,
};

describe("complaint-to-revision workflow", () => {
  it("rejects incomplete or out-of-range feedback", () => {
    const pkg = generatePackage(lectureIntake);
    const errors = validateWorkflowFeedback({ ...validFeedback, failedStepOrder: 99, usefulnessRating: 6, report: "Too vague" }, pkg);
    expect(errors).toHaveLength(3);
  });

  it("drafts a correction only for the reported step", () => {
    const pkg = generatePackage(lectureIntake);
    const original = structuredClone(pkg);
    const draft = draftWorkflowRevision(pkg, validFeedback, new Date("2026-07-17T03:00:00.000Z"));
    expect(draft.status).toBe("pending_approval");
    expect(draft.generator).toBe("local-rule-based-prototype");
    expect(draft.changes).toHaveLength(3);
    expect(draft.proposedPackage.version).toBe("0.2");
    expect(draft.proposedPackage.summary).toContain("does not replace the active package");
    expect(draft.proposedPackage.improvedWorkflow[2]).not.toEqual(pkg.improvedWorkflow[2]);
    expect(draft.proposedPackage.improvedWorkflow.filter((step, index) => step.action !== pkg.improvedWorkflow[index].action)).toHaveLength(1);
    expect(pkg).toEqual(original);
  });

  it("preserves human review and a safe fallback in the correction", () => {
    const pkg = generatePackage(lectureIntake);
    const draft = draftWorkflowRevision(pkg, validFeedback);
    const revised = draft.proposedPackage.improvedWorkflow[2];
    expect(revised.humanReview).toContain("accountable reviewer");
    expect(revised.humanReview).toContain(validFeedback.desiredOutcome);
    expect(revised.failureCondition).toContain("Keep the current approved step");
  });

  it("does not replace the active package until approval", () => {
    const pkg = generatePackage(lectureIntake);
    const draft = draftWorkflowRevision(pkg, validFeedback);
    expect(pkg.version).toBe("0.1");
    const approved = approveWorkflowRevision(draft, new Date("2026-07-17T03:05:00.000Z"));
    expect(approved.status).toBe("approved");
    expect(approved.package.version).toBe("0.2");
    expect(approved.package.summary).toContain("reviewed and approved");
    expect(approved.package).not.toBe(draft.proposedPackage);
  });
});
