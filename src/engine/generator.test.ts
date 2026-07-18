import { describe, expect, it } from "vitest";
import { lectureIntake, studentIntake } from "../data/fixtures";
import { generatePackage } from "./generator";
import { renderMarkdownFiles } from "./markdown";
import { scoreStep } from "./scoring";
import { validateIntake } from "./validation";
import { appendWorkflowStep, intakeDownloadName, moveWorkflowStep, removeWorkflowStep, serializeIntake, serializeWorkflowPackage, workflowPackageDownloadName } from "../intake";

describe("workflow engine", () => {
  it("validates the complete fixture", () => expect(validateIntake(lectureIntake).valid).toBe(true));
  it("rejects vague intake", () => expect(validateIntake({}).errors.length).toBeGreaterThan(3));
  it("keeps scores within one to five", () => {
    Object.values(scoreStep(lectureIntake.currentSteps[0], 240)).forEach((score) => expect(score).toBeGreaterThanOrEqual(1));
    Object.values(scoreStep(lectureIntake.currentSteps[0], 240)).forEach((score) => expect(score).toBeLessThanOrEqual(5));
  });
  it("generates a complete package and nine markdown files", () => {
    const pkg = generatePackage(lectureIntake);
    expect(pkg.improvedWorkflow).toHaveLength(11);
    expect(pkg.assets.length).toBeGreaterThanOrEqual(8);
    expect(pkg.improvedWorkflow.every((step) => step.aiInvolvement && step.failureCondition)).toBe(true);
    expect(pkg.priorityImprovements).toHaveLength(3);
    expect(Object.keys(renderMarkdownFiles(pkg))).toHaveLength(9);
  });
  it("generates the complete student planning workflow", () => {
    const pkg = generatePackage(studentIntake);
    expect(pkg.improvedWorkflow).toHaveLength(10);
    expect(pkg.assets.length).toBeGreaterThanOrEqual(8);
    expect(pkg.assets.some((asset) => asset.kind === "prompt")).toBe(true);
    expect(pkg.assets.some((asset) => asset.kind === "checklist")).toBe(true);
    expect(pkg.measurement.targetTimeMinutes).toBeLessThan(pkg.measurement.baselineTimeMinutes);
  });
  it("rejects steps without executable inputs and outputs", () => {
    const invalid = structuredClone(lectureIntake);
    invalid.currentSteps[0].inputs = [];
    invalid.currentSteps[0].output = "";
    expect(validateIntake(invalid).valid).toBe(false);
  });
  it("can eliminate a repeated step with no clear purpose", () => {
    const redundant = { ...lectureIntake.currentSteps[0], description: "Duplicate copy with no clear purpose", humanReviewMandatory: false };
    const scores = scoreStep(redundant, lectureIntake.currentTimeMinutes);
    expect(generatePackage({ ...lectureIntake, workflowName: "Organize teaching files", currentSteps: [redundant] }).diagnosis[0].classification).toBe("ELIMINATE");
    expect(Object.values(scores).every((score) => score >= 1 && score <= 5)).toBe(true);
  });
  it("adds, reorders, and removes intake steps while preserving order", () => {
    const original = lectureIntake.currentSteps.slice(0, 2);
    const added = appendWorkflowStep(original, { ...lectureIntake.currentSteps[2], order: 99 });
    expect(added.map((step) => step.order)).toEqual([1, 2, 3]);
    const moved = moveWorkflowStep(added, 2, -1);
    expect(moved.map((step) => step.id)).toEqual(["l1", "l3", "l2"]);
    const removed = removeWorkflowStep(moved, "l3");
    expect(removed.map((step) => [step.id, step.order])).toEqual([["l1", 1], ["l2", 2]]);
  });
  it("serializes a valid downloadable intake with a safe filename", () => {
    const exported = JSON.parse(serializeIntake(studentIntake));
    expect(exported).toEqual(studentIntake);
    expect(validateIntake(exported).valid).toBe(true);
    expect(intakeDownloadName(studentIntake.workflowName)).toBe("plan-an-academic-week-intake.json");
  });
  it("serializes a generated package with a safe filename", () => {
    const pkg = generatePackage(lectureIntake);
    const exported = JSON.parse(serializeWorkflowPackage(pkg));
    expect(exported.metadata.workflowName).toBe(lectureIntake.workflowName);
    expect(exported.improvedWorkflow.every((step: { action: string; humanReview: string }) => step.action && step.humanReview)).toBe(true);
    expect(workflowPackageDownloadName("Review & revise: weekly lecture")).toBe("review-revise-weekly-lecture-package.json");
  });
});
