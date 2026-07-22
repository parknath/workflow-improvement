import { describe, expect, it } from "vitest";
import { assessPilotCompleteness, evaluateProfessorPilotCohort, type ProfessorPilotRecord } from "./professorPilot";

function record(participantCode: string, overrides: Partial<ProfessorPilotRecord> = {}): ProfessorPilotRecord {
  return {
    participantCode,
    painfulJobConfirmed: true,
    dataBoundaryConfirmed: true,
    containsPersonalData: false,
    session1: {
      completedOn: "2026-07-22",
      intakeCompletedWithoutHelp: true,
      packageGenerated: true,
      usefulnessRating: 4,
      genuineComplaint: "The review step omitted the learning-objective check.",
      correctionDecision: "approved",
      correctionReason: "The focused change restored the required check.",
      criticalDefect: "none",
      criticalDefectResolved: true,
    },
    session2: {
      completedOn: "2026-07-29",
      comparableTaskBasis: "Same assignment family, objective, policy boundary, and expected output.",
      completedWithoutHelp: true,
      taskCompleted: true,
      usefulnessRating: 4,
      complaintResolved: true,
      approvedCorrectionUseful: true,
      criticalDefect: "none",
      criticalDefectResolved: true,
      freeInstitutionalSubstituteAdequate: false,
    },
    purchaseEvidence: {
      preferredFormat: "ongoing_revision_subscription",
      preferredPayer: "professional_development",
      tooCheapMonthly: 5,
      reasonableMonthly: 20,
      expensiveButPossibleMonthly: 35,
      tooExpensiveMonthly: 60,
      commitment: "paid_pilot_when_available",
      commitmentEvidence: "Participant accepted a paid-pilot follow-up when available.",
    },
    ...overrides,
  };
}

describe("professor pilot evidence gate", () => {
  it("keeps incomplete or synthetic records out of cohort evidence", () => {
    const synthetic = record("SYNTHETIC-001");
    expect(assessPilotCompleteness(synthetic).complete).toBe(false);
    expect(evaluateProfessorPilotCohort([synthetic])).toMatchObject({ recommendation: "collect_more", completePilotCount: 0, excludedSyntheticCount: 1 });
  });

  it("continues only when all precommitted gates pass", () => {
    const records = [1, 2, 3, 4, 5].map((index) => record(`PILOT-00${index}`));
    const result = evaluateProfessorPilotCohort(records);
    expect(result.recommendation).toBe("continue_subscription_thesis");
    expect(result.gates.every((item) => item.passed)).toBe(true);
  });

  it("does not treat usefulness as payment evidence", () => {
    const records = [1, 2, 3, 4, 5].map((index) => record(`PILOT-00${index}`, {
      purchaseEvidence: {
        preferredFormat: "ongoing_revision_subscription",
        preferredPayer: "professional_development",
        tooCheapMonthly: 5,
        reasonableMonthly: 20,
        expensiveButPossibleMonthly: 35,
        tooExpensiveMonthly: 60,
        commitment: "another_unpaid_test",
        commitmentEvidence: "Participant would continue only as an unpaid tester.",
      },
    }));
    const result = evaluateProfessorPilotCohort(records);
    expect(result.gates.find((item) => item.label === "Second-run usefulness at least 4/5")?.passed).toBe(true);
    expect(result.gates.find((item) => item.label === "Payment-oriented commitment")?.passed).toBe(false);
    expect(result.recommendation).toBe("pause_or_kill");
  });

  it("stops on a privacy or academic-control defect", () => {
    const records = [1, 2, 3, 4, 5].map((index) => record(`PILOT-00${index}`));
    records[0].session2!.criticalDefect = "privacy";
    records[0].session2!.criticalDefectResolved = false;
    const result = evaluateProfessorPilotCohort(records);
    expect(result.recommendation).toBe("pause_or_kill");
    expect(result.reasons[0]).toContain("privacy or academic-control defect");
  });

  it("keeps negative pain and complaint findings as evidence instead of dropping the record", () => {
    const negative = record("PILOT-NEG", {
      painfulJobConfirmed: false,
      session1: {
        ...record("BASE").session1,
        genuineComplaint: null,
        correctionDecision: "no_draft",
        correctionReason: "No consequential miss was found during the first run.",
      },
    });
    expect(assessPilotCompleteness(negative)).toMatchObject({ complete: true, missing: [] });
  });

  it("preserves the gate percentages when more than five complete records are evaluated", () => {
    const passing = [1, 2, 3, 4].map((index) => record(`PILOT-P${index}`));
    const weak = [5, 6, 7, 8, 9, 10].map((index) => record(`PILOT-W${index}`, {
      session1: { ...record("BASE").session1, intakeCompletedWithoutHelp: false },
      session2: { ...record("BASE").session2!, usefulnessRating: 3 },
      purchaseEvidence: { ...record("BASE").purchaseEvidence, preferredFormat: "one_time_package", commitment: "another_unpaid_test" },
    }));
    const result = evaluateProfessorPilotCohort([...passing, ...weak]);
    expect(result.gates.find((item) => item.label === "Uncoached intake and package generation")).toMatchObject({ actual: 4, required: 8, passed: false });
    expect(result.recommendation).not.toBe("continue_subscription_thesis");
  });
});
