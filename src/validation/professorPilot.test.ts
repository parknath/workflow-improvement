import { describe, expect, it } from "vitest";
import { assessPilotCompleteness, evaluateProfessorPilotCohort, type ProfessorPilotRecord } from "./professorPilot";

function record(participantCode: string, overrides: Partial<ProfessorPilotRecord> = {}): ProfessorPilotRecord {
  return {
    participantCode,
    disciplineCategory: "arts_humanities",
    courseLevel: "upper_undergraduate",
    assignmentType: "writing_research",
    workflowFrequency: "multiple_per_term",
    policyStatus: "guidance_only",
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
      fallbackIfUnavailable: "general_ai_institutional",
      currentPersonalSpendMonthly: 0,
      preferredFormat: "ongoing_revision_subscription",
      preferredPayer: "professional_development",
      fundingPathChecked: true,
      availableFundingPath: "professional_development",
      fundingPathEvidence: "The participant confirmed an available professional-development reimbursement path.",
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
    expect(result.coverageWarnings).toContain("All complete pilots are in arts_humanities; do not generalize across disciplines.");
    expect(result.coverageWarnings).toContain("No complete pilot verified an available personal-card payment path; payer preference alone is not payment access.");
  });

  it("does not treat usefulness as payment evidence", () => {
    const records = [1, 2, 3, 4, 5].map((index) => record(`PILOT-00${index}`, {
      purchaseEvidence: {
        fallbackIfUnavailable: "general_ai_institutional",
        currentPersonalSpendMonthly: 0,
        preferredFormat: "ongoing_revision_subscription",
        preferredPayer: "professional_development",
        fundingPathChecked: true,
        availableFundingPath: "professional_development",
        fundingPathEvidence: "The participant confirmed an available professional-development reimbursement path.",
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

  it("requires actual substitute, spend, and funding-path evidence", () => {
    const incomplete = record("PILOT-FUND", {
      purchaseEvidence: {
        ...record("BASE").purchaseEvidence,
        fallbackIfUnavailable: "not_asked",
        currentPersonalSpendMonthly: null,
        fundingPathChecked: false,
        availableFundingPath: "not_checked",
        fundingPathEvidence: null,
      },
    });
    expect(assessPilotCompleteness(incomplete).missing).toEqual(expect.arrayContaining([
      "ask what the professor would use if Workflow Lab were unavailable",
      "record current personal monthly spend, including zero",
      "check an actual available payer or reimbursement path",
      "record evidence for the available funding path",
    ]));
  });

  it("rejects placeholder context values from cohort coverage", () => {
    const incomplete = record("PILOT-CONTEXT", {
      disciplineCategory: "not_recorded",
      courseLevel: "not_recorded",
      assignmentType: "not_recorded",
      workflowFrequency: "not_recorded",
      policyStatus: "not_recorded",
    });
    expect(assessPilotCompleteness(incomplete).missing).toEqual(expect.arrayContaining([
      "record the broad discipline category",
      "record the course level",
      "record the assignment type",
      "record the workflow frequency",
      "record the institutional policy status",
    ]));
    expect(evaluateProfessorPilotCohort([incomplete]).coverage.every((item) => item.values.length === 0)).toBe(true);
  });

  it("reports decision-relevant cohort coverage without changing the precommitted gates", () => {
    const records = [
      record("PILOT-001", { disciplineCategory: "arts_humanities", assignmentType: "writing_research", workflowFrequency: "weekly" }),
      record("PILOT-002", { disciplineCategory: "business", assignmentType: "project_case", workflowFrequency: "biweekly" }),
      record("PILOT-003", { disciplineCategory: "education", assignmentType: "discussion_presentation", workflowFrequency: "monthly" }),
      record("PILOT-004", { disciplineCategory: "engineering_computing", assignmentType: "problem_set_coding", workflowFrequency: "multiple_per_term" }),
      record("PILOT-005", {
        disciplineCategory: "social_sciences",
        assignmentType: "writing_research",
        workflowFrequency: "event_driven",
        purchaseEvidence: { ...record("BASE").purchaseEvidence, availableFundingPath: "personal_card", fundingPathEvidence: "The participant confirmed a personal-card path is available." },
      }),
    ];
    const result = evaluateProfessorPilotCohort(records);
    expect(result.coverage.find((item) => item.label === "Discipline")?.values).toHaveLength(5);
    expect(result.coverage.find((item) => item.label === "Assignment type")?.values[0]).toEqual({ value: "writing_research", count: 2 });
    expect(result.coverageWarnings).toEqual([]);
    expect(result.recommendation).toBe("continue_subscription_thesis");
  });
});
