export type CriticalDefect = "none" | "privacy" | "academic_control";

export interface ProfessorPilotRecord {
  participantCode: string;
  disciplineCategory: "arts_humanities" | "business" | "education" | "engineering_computing" | "health_sciences" | "natural_sciences" | "social_sciences" | "interdisciplinary_other" | "not_recorded";
  courseLevel: "lower_undergraduate" | "upper_undergraduate" | "graduate" | "professional" | "mixed" | "not_recorded";
  assignmentType: "writing_research" | "problem_set_coding" | "project_case" | "lab_clinical" | "discussion_presentation" | "other" | "not_recorded";
  workflowFrequency: "weekly" | "biweekly" | "monthly" | "multiple_per_term" | "once_per_term" | "event_driven" | "not_recorded";
  policyStatus: "approved_tool_available" | "guidance_only" | "unclear_or_missing" | "tested_use_prohibited" | "not_recorded";
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
    fallbackIfUnavailable: "manual_process" | "general_ai_personal" | "general_ai_institutional" | "teaching_center_or_colleague" | "specialist_tool" | "none" | "other" | "not_asked";
    currentPersonalSpendMonthly: number | null;
    preferredFormat: "ongoing_revision_subscription" | "one_time_package" | "institution_provided" | "none" | "undecided" | "not_asked";
    preferredPayer: "personal_card" | "professional_development" | "department" | "teaching_center" | "student_shared" | "none" | "undecided" | "not_asked";
    fundingPathChecked: boolean;
    availableFundingPath: "personal_card" | "professional_development" | "department" | "teaching_center" | "grant" | "student_shared" | "none" | "unknown" | "not_checked";
    fundingPathEvidence: string | null;
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

export interface PilotCoverage {
  label: string;
  values: Array<{ value: string; count: number }>;
}

export interface CohortDecision {
  recommendation: "collect_more" | "continue_subscription_thesis" | "change_or_narrow" | "pause_or_kill";
  realPilotCount: number;
  excludedSyntheticCount: number;
  completePilotCount: number;
  gates: CohortGate[];
  coverage: PilotCoverage[];
  coverageWarnings: string[];
  reasons: string[];
}

const paymentCommitments = new Set(["paid_pilot_when_available", "introduce_buyer"]);

export function assessPilotCompleteness(record: ProfessorPilotRecord): PilotCompleteness {
  const missing: string[] = [];
  if (record.participantCode.startsWith("SYNTHETIC-")) missing.push("replace the synthetic fixture with a real coded participant");
  if (record.disciplineCategory === "not_recorded") missing.push("record the broad discipline category");
  if (record.courseLevel === "not_recorded") missing.push("record the course level");
  if (record.assignmentType === "not_recorded") missing.push("record the assignment type");
  if (record.workflowFrequency === "not_recorded") missing.push("record the workflow frequency");
  if (record.policyStatus === "not_recorded") missing.push("record the institutional policy status");
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
  if (record.purchaseEvidence.fallbackIfUnavailable === "not_asked") missing.push("ask what the professor would use if Workflow Lab were unavailable");
  if (record.purchaseEvidence.currentPersonalSpendMonthly === null) missing.push("record current personal monthly spend, including zero");
  if (record.purchaseEvidence.preferredFormat === "not_asked") missing.push("ask the preferred purchase format");
  if (record.purchaseEvidence.preferredPayer === "not_asked") missing.push("ask the preferred payer");
  if (!record.purchaseEvidence.fundingPathChecked || record.purchaseEvidence.availableFundingPath === "not_checked") missing.push("check an actual available payer or reimbursement path");
  if (!record.purchaseEvidence.fundingPathEvidence) missing.push("record evidence for the available funding path");
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

function coverage(label: string, values: string[]): PilotCoverage {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return {
    label,
    values: [...counts.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value)),
  };
}

export function evaluateProfessorPilotCohort(records: ProfessorPilotRecord[]): CohortDecision {
  const excludedSyntheticCount = records.filter((record) => record.participantCode.startsWith("SYNTHETIC-")).length;
  const realRecords = records.filter((record) => !record.participantCode.startsWith("SYNTHETIC-"));
  const completeRecords = realRecords.filter((record) => assessPilotCompleteness(record).complete);
  const count = (predicate: (record: ProfessorPilotRecord) => boolean) => completeRecords.filter(predicate).length;
  const decisionDenominator = Math.max(5, completeRecords.length);
  const required = (share: number) => Math.ceil(decisionDenominator * share);
  const gates = [
    gate("Uncoached intake and package generation", count((record) => record.session1.intakeCompletedWithoutHelp === true && record.session1.packageGenerated === true), required(0.8)),
    gate("Second-run usefulness at least 4/5", count((record) => (record.session2?.usefulnessRating ?? 0) >= 4), required(0.8)),
    gate("Useful approved correction on next run", count((record) => record.session1.correctionDecision === "approved" && record.session2?.complaintResolved === true && record.session2.approvedCorrectionUseful === true), required(0.6)),
    gate("Ongoing revision preferred", count((record) => record.purchaseEvidence.preferredFormat === "ongoing_revision_subscription"), required(0.6)),
    gate("Payment-oriented commitment", count((record) => paymentCommitments.has(record.purchaseEvidence.commitment)), required(0.4)),
  ];
  const cohortCoverage = [
    coverage("Discipline", completeRecords.map((record) => record.disciplineCategory)),
    coverage("Course level", completeRecords.map((record) => record.courseLevel)),
    coverage("Assignment type", completeRecords.map((record) => record.assignmentType)),
    coverage("Workflow frequency", completeRecords.map((record) => record.workflowFrequency)),
    coverage("Policy status", completeRecords.map((record) => record.policyStatus)),
    coverage("Available funding path", completeRecords.map((record) => record.purchaseEvidence.availableFundingPath)),
  ];
  const recurringFrequencies = new Set(["weekly", "biweekly", "monthly", "multiple_per_term"]);
  const coverageWarnings = completeRecords.length < 5 ? [] : [
    cohortCoverage[0].values.length === 1 ? `All complete pilots are in ${cohortCoverage[0].values[0].value}; do not generalize across disciplines.` : "",
    cohortCoverage[2].values.length === 1 ? `All complete pilots use ${cohortCoverage[2].values[0].value} assignments; do not generalize across assignment types.` : "",
    !completeRecords.some((record) => recurringFrequencies.has(record.workflowFrequency)) ? "No complete pilot covers a workflow recurring more than once per term; subscription retention remains untested." : "",
    !completeRecords.some((record) => record.purchaseEvidence.availableFundingPath === "personal_card") ? "No complete pilot verified an available personal-card payment path; payer preference alone is not payment access." : "",
  ].filter(Boolean);
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
      coverage: cohortCoverage,
      coverageWarnings,
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
      coverage: cohortCoverage,
      coverageWarnings,
      reasons: ["All precommitted continue gates passed and no privacy or academic-control defect remains."],
    };
  }

  const pauseReasons = [
    unresolvedCritical > 0 ? `${unresolvedCritical} complete pilot record(s) contain a privacy or academic-control defect.` : "",
    painfulJobs < required(0.6) ? `Only ${painfulJobs} of ${completeRecords.length} professors confirmed a current painful job.` : "",
    secondRunsWithoutHelp < required(0.6) ? `Only ${secondRunsWithoutHelp} of ${completeRecords.length} completed a second run without help.` : "",
    usefulSecondRuns < required(0.6) ? `Only ${usefulSecondRuns} of ${completeRecords.length} rated the second run at least 4/5.` : "",
    commitments === 0 ? "No professor made a payment-oriented commitment." : "",
    adequateFreeSubstitutes >= required(0.6) ? `${adequateFreeSubstitutes} of ${completeRecords.length} said a free institutional substitute adequately solves the job.` : "",
  ].filter(Boolean);

  if (pauseReasons.length > 0) {
    return {
      recommendation: "pause_or_kill",
      realPilotCount: realRecords.length,
      excludedSyntheticCount,
      completePilotCount: completeRecords.length,
      gates,
      coverage: cohortCoverage,
      coverageWarnings,
      reasons: pauseReasons,
    };
  }

  return {
    recommendation: "change_or_narrow",
    realPilotCount: realRecords.length,
    excludedSyntheticCount,
    completePilotCount: completeRecords.length,
    gates,
    coverage: cohortCoverage,
    coverageWarnings,
    reasons: ["The evidence avoids the pause thresholds but does not clear every continue gate; narrow the workflow, buyer, payer, or recurring offer before building more scope."],
  };
}
