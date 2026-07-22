export type CriticalDefect = "none" | "privacy" | "academic_control";

export interface ProfessorPilotRecord {
  participantCode: string;
  painfulJobConfirmed: boolean;
  dataBoundaryConfirmed: boolean;
  containsPersonalData: false;
  session1: {
    completedOn: string | null;
    intakeCompletedWithoutHelp: boolean | null;
    packageGenerated: boolean | null;
    usefulnessRating: number | null;
    genuineComplaint: string | null;
    correctionDecision: "approved" | "rejected" | "unsafe" | "no_draft" | "not_completed";
    correctionReason: string | null;
    criticalDefect: CriticalDefect;
    criticalDefectResolved: boolean;
  };
  session2: null | {
    completedOn: string;
    comparableTaskBasis: string;
    completedWithoutHelp: boolean;
    taskCompleted: boolean;
    usefulnessRating: number;
    complaintResolved: boolean | null;
    approvedCorrectionUseful: boolean | null;
    criticalDefect: CriticalDefect;
    criticalDefectResolved: boolean;
    freeInstitutionalSubstituteAdequate: boolean;
  };
  purchaseEvidence: {
    preferredFormat: "ongoing_revision_subscription" | "one_time_package" | "institution_provided" | "none" | "undecided" | "not_asked";
    preferredPayer: "personal_card" | "professional_development" | "department" | "teaching_center" | "student_shared" | "none" | "undecided" | "not_asked";
    tooCheapMonthly: number | null;
    reasonableMonthly: number | null;
    expensiveButPossibleMonthly: number | null;
    tooExpensiveMonthly: number | null;
    commitment: "paid_pilot_when_available" | "introduce_buyer" | "another_unpaid_test" | "stop" | "none" | "not_asked";
    commitmentEvidence: string | null;
  };
}

export interface PilotCompleteness {
  participantCode: string;
  complete: boolean;
  missing: string[];
}

export interface CohortGate {
  label: string;
  actual: number;
  required: number;
  passed: boolean;
}

export interface CohortDecision {
  recommendation: "collect_more" | "continue_subscription_thesis" | "change_or_narrow" | "pause_or_kill";
  realPilotCount: number;
  excludedSyntheticCount: number;
  completePilotCount: number;
  gates: CohortGate[];
  reasons: string[];
}

const paymentCommitments = new Set(["paid_pilot_when_available", "introduce_buyer"]);

export function assessPilotCompleteness(record: ProfessorPilotRecord): PilotCompleteness {
  const missing: string[] = [];
  if (record.participantCode.startsWith("SYNTHETIC-")) missing.push("replace the synthetic fixture with a real coded participant");
  if (!record.dataBoundaryConfirmed) missing.push("confirm the privacy/data boundary");
  if (!record.session1.completedOn) missing.push("complete session 1");
  if (record.session1.intakeCompletedWithoutHelp === null) missing.push("record uncoached intake completion");
  if (record.session1.packageGenerated === null) missing.push("record package generation");
  if (record.session1.usefulnessRating === null) missing.push("record session-1 usefulness");
  if (record.session1.correctionDecision === "not_completed") missing.push("record the correction decision");
  if (!record.session1.genuineComplaint && record.session1.correctionDecision !== "no_draft") missing.push("use no_draft when no genuine complaint was found");
  if (record.session1.genuineComplaint && record.session1.correctionDecision === "no_draft") missing.push("record the decision on the genuine complaint");
  if (!record.session1.correctionReason) missing.push("record why the correction was approved, rejected, or unsafe");
  if (!record.session2) missing.push("complete session 2");
  if (record.purchaseEvidence.preferredFormat === "not_asked") missing.push("ask the preferred purchase format");
  if (record.purchaseEvidence.preferredPayer === "not_asked") missing.push("ask the preferred payer");
  const prices = [record.purchaseEvidence.tooCheapMonthly, record.purchaseEvidence.reasonableMonthly, record.purchaseEvidence.expensiveButPossibleMonthly, record.purchaseEvidence.tooExpensiveMonthly];
  if (prices.some((price) => price === null)) missing.push("record all four unaided monthly price thresholds");
  if (prices.every((price) => price !== null) && !(prices[0]! <= prices[1]! && prices[1]! <= prices[2]! && prices[2]! <= prices[3]!)) missing.push("record monthly price thresholds in ascending order");
  if (record.purchaseEvidence.commitment === "not_asked") missing.push("ask for a concrete next commitment");
  if (!record.purchaseEvidence.commitmentEvidence) missing.push("record evidence for the commitment answer");
  return { participantCode: record.participantCode, complete: missing.length === 0, missing };
}

function gate(label: string, actual: number, required: number): CohortGate {
  return { label, actual, required, passed: actual >= required };
}

export function evaluateProfessorPilotCohort(records: ProfessorPilotRecord[]): CohortDecision {
  const excludedSyntheticCount = records.filter((record) => record.participantCode.startsWith("SYNTHETIC-")).length;
  const realRecords = records.filter((record) => !record.participantCode.startsWith("SYNTHETIC-"));
  const completeRecords = realRecords.filter((record) => assessPilotCompleteness(record).complete);
  const count = (predicate: (record: ProfessorPilotRecord) => boolean) => completeRecords.filter(predicate).length;
  const gates = [
    gate("Uncoached intake and package generation", count((record) => record.session1.intakeCompletedWithoutHelp === true && record.session1.packageGenerated === true), 4),
    gate("Second-run usefulness at least 4/5", count((record) => (record.session2?.usefulnessRating ?? 0) >= 4), 4),
    gate("Useful approved correction on next run", count((record) => record.session1.correctionDecision === "approved" && record.session2?.complaintResolved === true && record.session2.approvedCorrectionUseful === true), 3),
    gate("Ongoing revision preferred", count((record) => record.purchaseEvidence.preferredFormat === "ongoing_revision_subscription"), 3),
    gate("Payment-oriented commitment", count((record) => paymentCommitments.has(record.purchaseEvidence.commitment)), 2),
  ];
  const unresolvedCritical = count((record) =>
    (record.session1.criticalDefect !== "none" && !record.session1.criticalDefectResolved)
    || (record.session2 !== null && record.session2.criticalDefect !== "none" && !record.session2.criticalDefectResolved),
  );
  const painfulJobs = count((record) => record.painfulJobConfirmed);
  const secondRunsWithoutHelp = count((record) => record.session2?.completedWithoutHelp === true);
  const usefulSecondRuns = count((record) => (record.session2?.usefulnessRating ?? 0) >= 4);
  const commitments = count((record) => paymentCommitments.has(record.purchaseEvidence.commitment));
  const adequateFreeSubstitutes = count((record) => record.session2?.freeInstitutionalSubstituteAdequate === true);

  if (completeRecords.length < 5) {
    return {
      recommendation: "collect_more",
      realPilotCount: realRecords.length,
      excludedSyntheticCount,
      completePilotCount: completeRecords.length,
      gates,
      reasons: [`Collect ${5 - completeRecords.length} more complete real pilot record${5 - completeRecords.length === 1 ? "" : "s"} before applying the cohort decision rules.`],
    };
  }

  if (unresolvedCritical === 0 && gates.every((item) => item.passed)) {
    return {
      recommendation: "continue_subscription_thesis",
      realPilotCount: realRecords.length,
      excludedSyntheticCount,
      completePilotCount: completeRecords.length,
      gates,
      reasons: ["All precommitted continue gates passed and no privacy or academic-control defect remains."],
    };
  }

  const pauseReasons = [
    unresolvedCritical > 0 ? `${unresolvedCritical} complete pilot record(s) contain a privacy or academic-control defect.` : "",
    painfulJobs < 3 ? `Only ${painfulJobs} of ${completeRecords.length} professors confirmed a current painful job.` : "",
    secondRunsWithoutHelp < 3 ? `Only ${secondRunsWithoutHelp} of ${completeRecords.length} completed a second run without help.` : "",
    usefulSecondRuns < 3 ? `Only ${usefulSecondRuns} of ${completeRecords.length} rated the second run at least 4/5.` : "",
    commitments === 0 ? "No professor made a payment-oriented commitment." : "",
    adequateFreeSubstitutes >= 3 ? `${adequateFreeSubstitutes} of ${completeRecords.length} said a free institutional substitute adequately solves the job.` : "",
  ].filter(Boolean);

  if (pauseReasons.length > 0) {
    return {
      recommendation: "pause_or_kill",
      realPilotCount: realRecords.length,
      excludedSyntheticCount,
      completePilotCount: completeRecords.length,
      gates,
      reasons: pauseReasons,
    };
  }

  return {
    recommendation: "change_or_narrow",
    realPilotCount: realRecords.length,
    excludedSyntheticCount,
    completePilotCount: completeRecords.length,
    gates,
    reasons: ["The evidence avoids the pause thresholds but does not clear every continue gate; narrow the workflow, buyer, payer, or recurring offer before building more scope."],
  };
}
