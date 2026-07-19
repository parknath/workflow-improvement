import { useState, type FormEvent } from "react";
import { AlertTriangle, ArrowRight, Check, ChevronLeft, Clock3, Copy, Download, FileCheck2, Gauge, Play, RefreshCw, Save, ShieldCheck } from "lucide-react";
import { approveWorkflowRevision, draftWorkflowRevision, validateWorkflowFeedback } from "./revision";
import {
  applyApprovedPackage,
  completeFirstRunMeasurement,
  completeWorkflowStep,
  endWorkflowRun,
  goToPreviousWorkflowStep,
  recordWorkflowProblem,
  serializeRunSummary,
  skipWorkflowStep,
  startWorkflowRun,
  updateRunMeasurement,
  validateFirstRunMeasurement,
} from "./workflowRun";
import type { FeedbackCategory, FirstRunMeasurement, ReuseIntent, WorkflowFeedback, WorkflowPackage, WorkflowWorkspace } from "./types";

type ExperienceMode = "overview" | "run" | "problem" | "measurement" | "summary";

const feedbackCategories: Array<{ value: FeedbackCategory; label: string }> = [
  { value: "accuracy", label: "Accuracy or unsupported content" },
  { value: "clarity", label: "Instruction was unclear" },
  { value: "missing_input", label: "Required input was missing" },
  { value: "tool_fit", label: "Tool was unavailable or unsuitable" },
  { value: "time", label: "Step took too long" },
  { value: "other", label: "Another unmet need" },
];

function experienceMode(workspace: WorkflowWorkspace): ExperienceMode {
  if (workspace.pendingRevision) return "problem";
  if (workspace.currentRun?.status === "running") return "run";
  if (workspace.currentRun?.status === "measuring") return "measurement";
  if (workspace.currentRun?.status === "completed") return "summary";
  return "overview";
}

function Field({ label, value, onChange, placeholder = "", multiline = false }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; multiline?: boolean }) {
  return <label className="field"><span>{label}</span>{multiline ? <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder}/> : <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder}/>}</label>;
}

function downloadJson(contents: string, filename: string) {
  const blob = new Blob([contents], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function GeneratedWorkflowExperience({ workspace, setWorkspace, storageWarning, downloadPackage, downloadIntake, reviseIntake }: {
  workspace: WorkflowWorkspace;
  setWorkspace: (workspace: WorkflowWorkspace) => void;
  storageWarning: string;
  downloadPackage: () => void;
  downloadIntake: () => void;
  reviseIntake: () => void;
}) {
  const [mode, setMode] = useState<ExperienceMode>(() => experienceMode(workspace));
  const [notice, setNotice] = useState("");
  const pkg = workspace.activePackage;
  const run = workspace.currentRun;
  const firstStep = pkg.improvedWorkflow[0];
  const nextStep = run?.status === "running" ? pkg.improvedWorkflow.find((step) => step.order === run.currentStepOrder) ?? firstStep : firstStep;
  const start = () => { setWorkspace(startWorkflowRun(workspace)); setNotice(""); setMode("run"); scrollTo({ top: 0, behavior: "smooth" }); };

  if (mode === "run" && run) return <WorkflowRunner workspace={workspace} setWorkspace={setWorkspace} setMode={setMode} notice={notice} setNotice={setNotice}/>;
  if (mode === "problem" && run) return <CorrectionPanel workspace={workspace} setWorkspace={setWorkspace} setMode={setMode} setNotice={setNotice}/>;
  if (mode === "measurement" && run) return <RunMeasurement workspace={workspace} setWorkspace={setWorkspace} setMode={setMode}/>;
  if (mode === "summary" && workspace.lastRunSummary) return <RunSummary workspace={workspace} startNextRun={start} showWorkflow={() => setMode("overview")}/>;

  return <main className="result-page generated-result">
    <section className="action-result-hero">
      <div className="active-version"><span className="status ready">Active workflow · v{pkg.version}</span>{workspace.previousPackage && <small>Previous v{workspace.previousPackage.version} is retained in this browser.</small>}</div>
      <div className="action-result-grid"><div><span className="eyebrow">Your workflow is ready to use</span><h1>{pkg.metadata.workflowName}</h1><p className="workflow-objective">{pkg.metadata.objective}</p><div className="action-result-actions"><button className="button primary" onClick={run?.status === "running" ? () => setMode("run") : start}><Play/> {run?.status === "running" ? `Resume step ${run.currentStepOrder}` : workspace.lastRunSummary ? "Start next run" : "Start workflow"}</button><a className="button secondary" href="#workflow-details">Explore the full workflow</a></div></div>
      <aside className="next-action"><span>Immediate next action</span><b>{nextStep?.title}</b><p>{nextStep?.action}</p><small><Clock3/> Estimated {nextStep?.estimatedMinutes} minutes—not a measured result.</small></aside></div>
      <div className="value-loop" aria-label="How this workflow improves with use"><span><b>1. Run it</b><small>Follow one clear step at a time.</small></span><ArrowRight/><span><b>2. Measure it</b><small>Record what actually happened.</small></span><ArrowRight/><span><b>3. Improve it</b><small>Approve only corrections that help.</small></span></div>
    </section>
    {storageWarning && <div className="form-errors generated-warning" role="alert"><span>{storageWarning}</span></div>}
    {workspace.lastRunSummary && <section className="return-value"><RefreshCw/><div><span className="eyebrow">Reason to return</span><h2>Your last run is now a baseline for the next one.</h2><p>Run v{pkg.version} again to see whether the approved workflow is easier to follow and still produces the required result. No improvement is claimed until comparable runs support it.</p></div><button className="button secondary" onClick={() => setMode("summary")}>Review last run</button></section>}
    <div className="local-generation-note"><ShieldCheck/><div><b>Browser-local guided workflow</b><p>Workflow Lab guides the sequence but does not operate external tools or complete academic work. Progress stays in this browser. Do not enter confidential or identifiable student information; every AI-assisted draft still requires human review.</p></div></div>
    <WorkflowDetails pkg={pkg}/>
    <section className="section workflow-downloads"><div><span className="eyebrow">Keep a portable copy</span><h2>Downloads remain available.</h2><p>The active workflow and intake can be saved locally. Browser storage is convenient, not durable account storage.</p></div><div className="generated-actions"><button className="button secondary" onClick={downloadPackage}><Download/> Download active workflow</button><button className="button secondary" onClick={downloadIntake}>Download intake</button><button className="button text" onClick={reviseIntake}>Revise the intake</button></div></section>
  </main>;
}

function WorkflowDetails({ pkg }: { pkg: WorkflowPackage }) {
  return <div id="workflow-details">
    <section className="section generated-overview"><div className="result-summary"><span className="eyebrow">Why this should be better</span><h2>A repeatable first version, ready to test.</h2><p>{pkg.summary}</p></div><div className="metric-cards"><article><span>Current baseline</span><b>{pkg.baseline.estimatedTimeMinutes}<small> min</small></b></article><article><span>Workflow steps</span><b>{pkg.improvedWorkflow.length}</b></article><article className="target"><span>Prototype target</span><b>{pkg.measurement.targetTimeMinutes}<small> min*</small></b></article></div><small>*Estimate only. Record an actual run before judging improvement.</small></section>
    <section className="section result-content generated-detail"><div className="section-title"><span className="eyebrow">Step-level diagnosis</span><h2>Where the current process creates effort or risk.</h2></div><div className="diagnosis-table"><div className="table-head"><span>Current step</span><span>Minutes</span><span>Treatment</span><span>Opportunity</span></div>{pkg.diagnosis.map((step) => <div className="table-row" key={step.id}><span><b>{step.order}. {step.description}</b><small>{step.painPoints.join(" · ")}</small></span><span>{step.estimatedMinutes}</span><span><em>{step.classification.replace("_"," ")}</em></span><span>{step.opportunityScore}</span></div>)}</div></section>
    <section className="section result-content generated-detail"><div className="section-title"><span className="eyebrow">Full workflow</span><h2>The complete sequence and review boundaries.</h2></div><div className="operating-steps">{pkg.improvedWorkflow.map((step) => <article key={step.order}><span className="op-num">{String(step.order).padStart(2,"0")}</span><div><span className="status ready">{step.classification.replace("_"," ")}</span><h3>{step.title}</h3><div className="op-grid"><p><b>Input</b>{step.input}</p><p><b>Action</b>{step.action}</p><p><b>Tool</b>{step.tool}</p><p><b>Output</b>{step.output}</p><p><b>AI involvement</b>{step.aiInvolvement}</p><p><b>Human review</b>{step.humanReview}</p></div><small><Clock3/> Estimated {step.estimatedMinutes} minutes · {step.failureCondition}</small></div></article>)}</div></section>
    <section className="section result-content generated-detail tinted"><div className="section-title"><span className="eyebrow">Reusable assets</span><h2>The prepared material linked to workflow steps.</h2></div><div className="asset-grid">{pkg.assets.map((asset) => <article key={asset.name}><span>{asset.kind} · step {asset.stepOrders.join(", ")}</span><h3>{asset.name}</h3><p>{asset.purpose}</p><pre>{asset.content}</pre></article>)}</div></section>
    <section className="section result-content generated-detail"><div className="section-title"><span className="eyebrow">Measurement plan</span><h2>Test whether the next run is actually better.</h2></div><div className="measure-grid"><article><Gauge/><h3>Record actual time</h3><p>Compare a real run with the {pkg.measurement.baselineTimeMinutes}-minute user baseline.</p></article><article><FileCheck2/><h3>Count corrections</h3><p>Track work needed after drafts and instructions.</p></article><article><RefreshCw/><h3>Test repeatability</h3><p>Use the active version again and compare like with like.</p></article></div></section>
  </div>;
}

function WorkflowRunner({ workspace, setWorkspace, setMode, notice, setNotice }: { workspace: WorkflowWorkspace; setWorkspace: (workspace: WorkflowWorkspace) => void; setMode: (mode: ExperienceMode) => void; notice: string; setNotice: (notice: string) => void }) {
  const run = workspace.currentRun!;
  const pkg = workspace.activePackage;
  const step = pkg.improvedWorkflow.find((item) => item.order === run.currentStepOrder) ?? pkg.improvedWorkflow[0];
  const stepIndex = pkg.improvedWorkflow.findIndex((item) => item.order === step.order);
  const assets = pkg.assets.filter((asset) => asset.stepOrders.includes(step.order));
  const progress = Math.round(((run.completedStepOrders.length + run.skippedStepOrders.length) / pkg.improvedWorkflow.length) * 100);
  const move = (kind: "complete" | "skip") => { let next = kind === "complete" ? completeWorkflowStep(workspace) : skipWorkflowStep(workspace); if (next.currentRun?.status === "measuring") { next = endWorkflowRun(next); setMode("measurement"); } setWorkspace(next); setNotice(kind === "complete" ? `Step ${step.order} completed.` : `Step ${step.order} skipped and recorded.`); scrollTo({ top: 0, behavior: "smooth" }); };
  const copyAsset = async (name: string, content: string) => { try { await navigator.clipboard.writeText(content); setNotice(`${name} copied.`); } catch { setNotice("Copy was unavailable in this browser. Select the asset text and copy it manually."); } };
  return <main className="workflow-run-page"><section className="run-shell">
    <header className="run-header"><div><span className="eyebrow">Workflow run · active v{pkg.version}</span><h1>{pkg.metadata.workflowName}</h1></div><button className="button text" onClick={() => setMode("overview")}><Save/> Save and exit</button></header>
    <div className="run-progress-meta"><span>Step {stepIndex + 1} of {pkg.improvedWorkflow.length}</span><b>{progress}% recorded</b></div><div className="progress-track" role="progressbar" aria-label={`Workflow run progress: ${progress}%`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{ width: `${progress}%` }}/></div>
    {notice && <div className="approval-notice" role="status"><Check/><span>{notice}</span></div>}
    <article className="run-step-card"><div className="run-step-heading"><span className="op-num">{String(step.order).padStart(2,"0")}</span><div><span className="status ready">{step.classification.replace("_"," ")}</span><h2>{step.title}</h2></div><small><Clock3/> Estimated {step.estimatedMinutes} min</small></div><div className="run-step-primary"><span>Do this now</span><p>{step.action}</p></div><div className="run-step-details"><p><b>Start with</b>{step.input}</p><p><b>Expected result</b>{step.output}</p><p><b>Suggested tool</b>{step.tool}</p><p><b>AI involvement</b>{step.aiInvolvement}</p></div><div className="human-check"><ShieldCheck/><div><b>Human review before continuing</b><p>{step.humanReview}</p></div></div><div className="stop-condition"><AlertTriangle/><div><b>Stop condition</b><p>{step.failureCondition}</p></div></div></article>
    {assets.length > 0 && <section className="step-assets" aria-labelledby="step-assets-heading"><div><span className="eyebrow">Reusable assets for this step</span><h2 id="step-assets-heading">Start from the prepared material.</h2></div>{assets.map((asset) => <article key={asset.name}><div className="asset-heading"><div><span>{asset.kind}</span><h3>{asset.name}</h3><p>{asset.purpose}</p></div><button className="button secondary compact-button" onClick={() => copyAsset(asset.name, asset.content)}><Copy/> Copy</button></div><pre>{asset.content}</pre><details><summary>Human verification and limits</summary><p><b>Verify:</b> {asset.humanVerification}</p><p><b>Do not:</b> {asset.prohibitedUse}</p></details></article>)}</section>}
    <div className="runner-actions"><button className="button secondary" disabled={stepIndex === 0} onClick={() => { setWorkspace(goToPreviousWorkflowStep(workspace)); setNotice(""); }}><ChevronLeft/> Back</button><button className="button text danger-text" onClick={() => setMode("problem")}><AlertTriangle/> Report a problem</button><button className="button secondary" onClick={() => move("skip")}>Skip step</button><button className="button primary" onClick={() => move("complete")}><Check/> Complete step</button></div><button className="end-run-link" onClick={() => { setWorkspace(endWorkflowRun(workspace)); setMode("measurement"); }}>End this run and record results</button><div className="run-boundary"><ShieldCheck/><p>This browser-local guide cannot open, operate, or verify external tools. You remain responsible for approved inputs, academic decisions, and final outputs.</p></div>
  </section></main>;
}

function RunMeasurement({ workspace, setWorkspace, setMode }: { workspace: WorkflowWorkspace; setWorkspace: (workspace: WorkflowWorkspace) => void; setMode: (mode: ExperienceMode) => void }) {
  const run = workspace.currentRun!;
  const measurement = run.measurement;
  const [errors, setErrors] = useState<string[]>([]);
  const set = <K extends keyof FirstRunMeasurement>(key: K, value: FirstRunMeasurement[K]) => setWorkspace(updateRunMeasurement(workspace, { ...measurement, [key]: value }));
  const submit = (event: FormEvent) => { event.preventDefault(); const nextErrors = validateFirstRunMeasurement(measurement); setErrors(nextErrors); if (nextErrors.length) return; try { setWorkspace(completeFirstRunMeasurement(workspace)); setMode("summary"); scrollTo({ top: 0, behavior: "smooth" }); } catch (error) { setErrors(error instanceof Error ? error.message.split("\n") : ["The first-run measurement could not be saved."]); } };
  return <main className="workflow-run-page"><section className="measurement-shell"><span className="eyebrow">First-run measurement</span><h1>What actually happened?</h1><p>Separate the prototype estimate from your measured result. This creates a baseline for deciding whether the next run is genuinely better.</p><form className="measurement-form" onSubmit={submit}><div className="two-fields">
    <label className="field"><span>Did you complete the task?</span><select value={measurement.taskCompleted === null ? "" : String(measurement.taskCompleted)} onChange={(event) => set("taskCompleted", event.target.value === "" ? null : event.target.value === "true")}><option value="">Choose…</option><option value="true">Yes</option><option value="false">No</option></select></label>
    <label className="field"><span>Actual total time</span><input type="number" min="1" value={measurement.actualTotalMinutes ?? ""} onChange={(event) => set("actualTotalMinutes", event.target.value ? Number(event.target.value) : null)}/><small>Minutes measured during this run</small></label>
    <label className="field"><span>How useful was the workflow?</span><select value={measurement.usefulnessRating || ""} onChange={(event) => set("usefulnessRating", Number(event.target.value))}><option value="">Choose…</option>{[1,2,3,4,5].map((rating) => <option value={rating} key={rating}>{rating} / 5</option>)}</select></label>
    <label className="field"><span>Corrections required</span><input type="number" min="0" value={measurement.correctionCount} onChange={(event) => set("correctionCount", Number(event.target.value))}/></label>
    <label className="field"><span>Most useful reusable asset</span><select value={measurement.mostUsefulAsset} onChange={(event) => set("mostUsefulAsset", event.target.value)}><option value="">Choose…</option><option value="No reusable asset helped">No reusable asset helped</option>{workspace.activePackage.assets.map((asset) => <option value={asset.name} key={asset.name}>{asset.name}</option>)}</select></label>
    <label className="field"><span>Least useful or most confusing step</span><select value={measurement.leastUsefulStepOrder ?? ""} onChange={(event) => set("leastUsefulStepOrder", event.target.value ? Number(event.target.value) : null)}><option value="">Choose…</option>{workspace.activePackage.improvedWorkflow.map((step) => <option value={step.order} key={step.order}>{step.order}. {step.title}</option>)}</select></label>
    <label className="field"><span>Do you expect to use this workflow again?</span><select value={measurement.reuseIntent} onChange={(event) => set("reuseIntent", event.target.value as ReuseIntent)}><option value="">Choose…</option><option value="yes">Yes</option><option value="maybe">Maybe</option><option value="no">No</option></select></label>
  </div><Field label="What should change before the next run?" value={measurement.nextChange} onChange={(value) => set("nextChange", value)} multiline placeholder="Name the smallest change that would make the next run more useful."/><div className="recorded-run-facts"><span><b>{run.completedStepOrders.length}</b> completed</span><span><b>{run.skippedStepOrders.length}</b> skipped</span><span><b>{run.problems.length}</b> problems reported</span></div>{errors.length > 0 && <div className="form-errors" role="alert"><b>Complete the measurement:</b>{errors.map((error) => <span key={error}>{error}</span>)}</div>}<div className="form-actions"><button className="button secondary" type="button" onClick={() => { setWorkspace({ ...workspace, currentRun: { ...run, status: "running" } }); setMode("run"); }}><ChevronLeft/> Return to workflow</button><button className="button primary" type="submit"><Save/> Save first-run result</button></div></form>
  </section></main>;
}

function RunSummary({ workspace, startNextRun, showWorkflow }: { workspace: WorkflowWorkspace; startNextRun: () => void; showWorkflow: () => void }) {
  const summary = workspace.lastRunSummary!;
  const [notice, setNotice] = useState("");
  const filename = `${summary.workflowName.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"") || "workflow"}-run-${summary.workflowVersion}.json`;
  const copy = async () => { try { await navigator.clipboard.writeText(serializeRunSummary(summary)); setNotice("First-run summary copied."); } catch { setNotice("Copy was unavailable. Download the summary instead."); } };
  return <main className="workflow-run-page"><section className="summary-shell"><div className="success-icon"><Check/></div><span className="eyebrow">Run recorded · workflow v{summary.workflowVersion}</span><h1>Your first result is now a baseline.</h1><p>This is measured evidence from your run, not a claim that Workflow Lab saved time or improved the academic outcome.</p>{notice && <div className="approval-notice" role="status"><Check/><span>{notice}</span></div>}<div className="summary-metrics"><article><span>Task completed</span><b>{summary.taskCompleted ? "Yes" : "No"}</b></article><article><span>Actual time</span><b>{summary.actualTotalMinutes} min</b></article><article><span>Usefulness</span><b>{summary.usefulnessRating} / 5</b></article><article><span>Corrections</span><b>{summary.correctionCount}</b></article></div><div className="summary-detail"><p><b>Most useful asset</b>{summary.mostUsefulAsset}</p><p><b>Least useful step</b>Step {summary.leastUsefulStepOrder}</p><p><b>Reuse intent</b>{summary.reuseIntent}</p><p><b>Next change</b>{summary.nextChange}</p></div><div className="next-run-panel"><RefreshCw/><div><h2>Why use it again?</h2><p>The next comparable run tests whether active v{workspace.activePackage.version} is easier to follow, requires fewer corrections, or produces a more reliable result. That improvement loop—not access to a static template—is the intended recurring value.</p></div></div><div className="summary-actions"><button className="button primary" onClick={startNextRun}><Play/> Start next run</button><button className="button secondary" onClick={copy}><Copy/> Copy summary</button><button className="button secondary" onClick={() => downloadJson(serializeRunSummary(summary), filename)}><Download/> Download summary</button><button className="button text" onClick={showWorkflow}>Review active workflow</button></div>
  </section></main>;
}

function CorrectionPanel({ workspace, setWorkspace, setMode, setNotice }: { workspace: WorkflowWorkspace; setWorkspace: (workspace: WorkflowWorkspace) => void; setMode: (mode: ExperienceMode) => void; setNotice: (notice: string) => void }) {
  const pkg = workspace.activePackage;
  const run = workspace.currentRun!;
  const currentStep = pkg.improvedWorkflow.find((step) => step.order === run.currentStepOrder) ?? pkg.improvedWorkflow[0];
  const [feedback, setFeedback] = useState<WorkflowFeedback>(workspace.pendingRevision?.feedback ?? { failedStepOrder: currentStep?.order ?? 1, category: "clarity", expectedOutcome: currentStep?.output ?? "", actualOutcome: "", fitReason: "", report: "", desiredOutcome: "", usefulnessRating: 3, actualTimeMinutes: null, correctionCount: 0 });
  const [errors, setErrors] = useState<string[]>([]);
  const draft = workspace.pendingRevision;
  const setFeedbackField = <K extends keyof WorkflowFeedback>(key: K, value: WorkflowFeedback[K]) => setFeedback((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent) => { event.preventDefault(); const nextErrors = validateWorkflowFeedback(feedback, pkg); setErrors(nextErrors); if (nextErrors.length) return; try { const nextDraft = draftWorkflowRevision(pkg, feedback); const withProblem = recordWorkflowProblem(workspace, feedback); setWorkspace({ ...withProblem, pendingRevision: nextDraft }); } catch (error) { setErrors(error instanceof Error ? error.message.split("\n") : ["The correction draft could not be created."]); } };
  const approve = () => { if (!draft) return; const approved = approveWorkflowRevision(draft); setWorkspace(applyApprovedPackage(workspace, approved.package)); setNotice(`Revision ${approved.package.version} is now active. Previous v${draft.originalVersion} remains saved in this browser.`); setMode("run"); };
  const selectedOriginal = pkg.improvedWorkflow.find((step) => step.order === feedback.failedStepOrder);
  const selectedDraft = draft?.proposedPackage.improvedWorkflow.find((step) => step.order === feedback.failedStepOrder);
  return <main className="workflow-run-page"><section className="correction-shell correction-loop" aria-labelledby="correction-heading"><button className="button text back-to-run" onClick={() => setMode("run")}><ChevronLeft/> Return to workflow</button><div className="section-title"><span className="eyebrow">Reported problem</span><h1 id="correction-heading">What did not meet your need?</h1><p>A local deterministic correction changes one step only. The active workflow stays unchanged until you approve it.</p></div><div className="prototype-boundary"><ShieldCheck/><p><b>Prototype boundary:</b> no report is sent to a server or external AI provider. Do not include confidential or identifiable student information.</p></div>{!draft ? <form className="feedback-form" onSubmit={submit}><div className="feedback-grid"><label className="field"><span>Usefulness so far</span><select value={feedback.usefulnessRating} onChange={(event) => setFeedbackField("usefulnessRating", Number(event.target.value))}>{[1,2,3,4,5].map((rating) => <option value={rating} key={rating}>{rating} / 5</option>)}</select></label><label className="field"><span>Step that did not fit</span><select value={feedback.failedStepOrder} onChange={(event) => setFeedbackField("failedStepOrder", Number(event.target.value))}>{pkg.improvedWorkflow.map((step) => <option value={step.order} key={step.order}>{step.order}. {step.title}</option>)}</select></label><label className="field"><span>Why did it fail?</span><select value={feedback.category} onChange={(event) => setFeedbackField("category", event.target.value as FeedbackCategory)}>{feedbackCategories.map((category) => <option value={category.value} key={category.value}>{category.label}</option>)}</select></label><label className="field"><span>Corrections already made</span><input type="number" min="0" value={feedback.correctionCount} onChange={(event) => setFeedbackField("correctionCount", Number(event.target.value))}/></label><label className="field"><span>Actual total time (optional)</span><input type="number" min="1" value={feedback.actualTimeMinutes ?? ""} onChange={(event) => setFeedbackField("actualTimeMinutes", event.target.value ? Number(event.target.value) : null)}/></label></div><Field label="What result did you expect?" value={feedback.expectedOutcome} onChange={(value) => setFeedbackField("expectedOutcome", value)} multiline/><Field label="What result did you actually get?" value={feedback.actualOutcome} onChange={(value) => setFeedbackField("actualOutcome", value)} multiline/><Field label="Why did this step not fit your work?" value={feedback.fitReason} onChange={(value) => setFeedbackField("fitReason", value)} multiline/><Field label="What happened?" value={feedback.report} onChange={(value) => setFeedbackField("report", value)} multiline placeholder="Describe the point where the workflow failed, became unclear, or produced the wrong result."/><Field label="Optional: what correction would you prefer?" value={feedback.desiredOutcome} onChange={(value) => setFeedbackField("desiredOutcome", value)} multiline placeholder="Leave blank to use the expected result as the approval target."/>{errors.length > 0 && <div className="form-errors" role="alert"><b>Complete these items:</b>{errors.map((error) => <span key={error}>{error}</span>)}</div>}<button className="button primary" type="submit"><RefreshCw/> Draft one correction</button></form> : <div className="revision-review"><div className="revision-status"><span className="status ready">Pending human approval</span><b>Active v{draft.originalVersion} remains unchanged</b><p>Review every changed field before making revision {draft.proposedPackage.version} active.</p></div><div className="revision-compare"><article><span className="card-label">CURRENT ACTIVE STEP</span><h3>{selectedOriginal?.title}</h3><p><b>Action</b>{selectedOriginal?.action}</p><p><b>Human review</b>{selectedOriginal?.humanReview}</p><p><b>Stop condition</b>{selectedOriginal?.failureCondition}</p></article><article><span className="card-label">DRAFT REVISION {draft.proposedPackage.version}</span><h3>{selectedDraft?.title}</h3><p><b>Action</b>{selectedDraft?.action}</p><p><b>Human review</b>{selectedDraft?.humanReview}</p><p><b>Stop condition</b>{selectedDraft?.failureCondition}</p></article></div><div className="revision-actions"><button className="button primary" type="button" onClick={approve}><Check/> Approve and make active</button><button className="button secondary" type="button" onClick={() => { setWorkspace({ ...workspace, pendingRevision: null }); setNotice("Draft revision rejected. The active workflow is unchanged."); setMode("run"); }}>Reject and keep active version</button></div></div>}
  </section></main>;
}
