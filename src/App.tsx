import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { ArrowRight, BookOpen, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Download, FileCheck2, Gauge, GraduationCap, Layers3, Menu, MoveDown, MoveUp, Plus, RefreshCw, ShieldCheck, Sparkles, Trash2, Workflow, X } from "lucide-react";
import { lectureIntake, studentIntake, workflowCards } from "./data/fixtures";
import { product } from "./config";
import { generatePackage } from "./engine/generator";
import { approveWorkflowRevision, draftWorkflowRevision, validateWorkflowFeedback } from "./revision";
import { validateIntake } from "./engine/validation";
import { appendWorkflowStep, intakeDownloadName, moveWorkflowStep, removeWorkflowStep, serializeIntake, serializeWorkflowPackage, workflowPackageDownloadName } from "./intake";
import type { FeedbackCategory, WorkflowFeedback, WorkflowIntake, WorkflowPackage, WorkflowRevisionDraft, WorkflowStep } from "./types";

type Route = "/" | "/how-it-works" | "/workflows" | "/demo" | "/intake" | "/sample-result";
const routes: Route[] = ["/", "/how-it-works", "/workflows", "/demo", "/intake", "/sample-result"];
const labels: Record<Route, string> = { "/": "Home", "/how-it-works": "How it works", "/workflows": "Workflows", "/demo": "Demo", "/intake": "Analyze", "/sample-result": "Sample result" };

const emptyStep = (order = 1): WorkflowStep => ({ id: crypto.randomUUID(), order, description: "", tool: "", inputs: [], output: "", estimatedMinutes: 15, painPoints: [], decisionsRequired: [], repeated: true, humanReviewMandatory: false });
const initialIntake: WorkflowIntake = { workflowName: "", userRole: "", objective: "", trigger: "", frequency: "Weekly", currentTimeMinutes: 60, tools: [], inputs: [], desiredOutputs: [], currentSteps: [emptyStep()], majorFrustrations: [], repeatedActions: [], humanJudgmentRequired: [], sensitiveInformation: "", successDefinition: "", desiredImprovement: "" };

function useRoute() {
  const read = () => routes.includes(location.pathname as Route) ? location.pathname as Route : "/";
  const [route, setRoute] = useState<Route>(read);
  useEffect(() => { const pop = () => setRoute(read()); addEventListener("popstate", pop); return () => removeEventListener("popstate", pop); }, []);
  const go = (next: Route) => { history.pushState({}, "", next); setRoute(next); scrollTo({ top: 0, behavior: "smooth" }); };
  return [route, go] as const;
}

function LinkButton({ to, children, kind = "primary", go }: { to: Route; children: ReactNode; kind?: "primary" | "secondary" | "text"; go: (to: Route) => void }) {
  return <button className={`button ${kind}`} onClick={() => go(to)}>{children}</button>;
}

function Header({ route, go }: { route: Route; go: (to: Route) => void }) {
  const [open, setOpen] = useState(false);
  return <header className="site-header"><div className="nav-shell">
    <button className="brand" onClick={() => go("/")} aria-label={`${product.name} home`}><span className="brand-mark"><Workflow size={20} /></span><span>{product.name}</span></button>
    <nav className={open ? "nav-links open" : "nav-links"} aria-label="Main navigation">
      {["/how-it-works", "/workflows", "/demo", "/sample-result"].map((item) => <button key={item} className={route === item ? "active" : ""} onClick={() => { go(item as Route); setOpen(false); }}>{labels[item as Route]}</button>)}
      <button className="nav-cta" onClick={() => { go("/intake"); setOpen(false); }}>{product.primaryAction} <ArrowRight size={15} /></button>
    </nav>
    <button className="menu-button" aria-label="Toggle navigation" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
  </div></header>;
}

function Footer({ go }: { go: (to: Route) => void }) {
  return <footer><div><span className="brand"><span className="brand-mark"><Workflow size={18} /></span><span>{product.name}</span></span><p>One recurring workflow. Clearer, faster, easier to repeat.</p></div><div className="footer-links"><button onClick={() => go("/how-it-works")}>Method</button><button onClick={() => go("/workflows")}>Workflows</button><button onClick={() => go("/sample-result")}>Example</button></div><small>Prototype · Human judgment stays in control</small></footer>;
}

function SectionTitle({ eyebrow, title, copy }: { eyebrow: string; title: string; copy?: string }) {
  return <div className="section-title"><span className="eyebrow">{eyebrow}</span><h2>{title}</h2>{copy && <p>{copy}</p>}</div>;
}

const problems = [
  [RefreshCw, "Rebuilding the same work", "Useful structures exist, but you start from a blank page again."],
  [Layers3, "Information everywhere", "Inputs live across folders, inboxes, calendars, and notes."],
  [Sparkles, "Inconsistent AI use", "Good results depend on remembering the right prompt and review process."],
  [FileCheck2, "No reliable finish line", "Important checks happen from memory—or not at all."],
];

function Transformation({ compact = false }: { compact?: boolean }) {
  return <div className={compact ? "transformation compact" : "transformation"}>
    <div className="before card"><span className="card-label">BEFORE</span><h3>Lecture preparation</h3><div className="metric-row"><b>6</b><span>loose steps</span><b>240</b><span>minutes</span></div><div className="messy-lines"><i /><i /><i /><i /></div><p>Scattered sources · Repeated drafting · Inconsistent review</p></div>
    <div className="transform-arrow"><ArrowRight /></div>
    <div className="after card"><span className="card-label">REDESIGNED</span><h3>Lecture preparation</h3><div className="metric-row"><b>11</b><span>defined steps</span><b>124</b><span>minute target*</span></div><div className="clean-flow"><i>1</i><span /><i>2</i><span /><i>3</i><span /><i>✓</i></div><p>Reusable structure · Clear outputs · Human checkpoints</p><small>*Prototype estimate, measured during real use.</small></div>
  </div>;
}

function Home({ go }: { go: (to: Route) => void }) {
  return <>
    <main>
      <section className="hero"><div className="hero-copy"><span className="eyebrow"><span className="live-dot" /> {product.descriptor}</span><h1>Improve the work you repeat <em>every week.</em></h1><p>{product.supportingCopy}</p><div className="hero-actions"><LinkButton to="/intake" go={go}>{product.primaryAction} <ArrowRight size={17} /></LinkButton><LinkButton to="/sample-result" kind="secondary" go={go}>{product.secondaryAction}</LinkButton></div><div className="trust-line"><span><Check /> No new software to learn</span><span><Check /> Human-reviewed</span><span><Check /> One workflow at a time</span></div></div><div className="hero-visual"><div className="paper-note note-one">Search old slides <Clock3 /></div><div className="paper-note note-two">Draft outline… again <RefreshCw /></div><div className="workflow-panel"><div className="panel-top"><span>YOUR IMPROVED WORKFLOW</span><span>11 defined steps</span></div>{["Collect sources", "Set objectives", "Build lecture brief", "Plan lesson & slides", "Human accuracy review"].map((x, i) => <div className="workflow-row" key={x}><span className={i === 4 ? "step-check" : "step-num"}>{i === 4 ? <Check size={13} /> : i + 1}</span><b>{x}</b><span className="row-time">{[10, 10, 15, 37, 15][i]} min</span></div>)}<div className="panel-result"><Gauge /><div><b>From scattered to repeatable</b><small>Prototype target: measured in real use</small></div></div></div></div></section>
      <section className="logo-strip"><span>Designed around the tools you already use</span><b>Google Drive</b><b>PowerPoint</b><b>Calendar</b><b>ChatGPT</b><b>Notion</b></section>
      <section className="section"><SectionTitle eyebrow="The real problem" title="Your tools aren't broken. Your process is." copy="Most recurring work becomes slow in the gaps—searching, switching, recreating, and remembering what comes next."/><div className="problem-grid">{problems.map(([Icon, title, copy]) => <article className="problem-card" key={String(title)}><Icon /><h3>{String(title)}</h3><p>{String(copy)}</p></article>)}</div></section>
      <section className="section tinted"><SectionTitle eyebrow="A concrete result" title="We redesign the workflow—not your whole life." copy="The product is the improved, repeatable process. AI only helps where it is useful and reviewable."/><Transformation /></section>
      <section className="section"><SectionTitle eyebrow="How it works" title="From friction to a workflow you can run."/><div className="process-grid">{[["01","Describe","Walk through one recurring task as you actually do it."],["02","Diagnose","Classify bottlenecks, repeated effort, risk, and judgment."],["03","Redesign","Create fewer, clearer steps with defined inputs and outputs."],["04","Run & measure","Test it on real work and improve the parts that do not hold up."]].map(([n,t,c]) => <article key={n}><span>{n}</span><h3>{t}</h3><p>{c}</p></article>)}</div></section>
      <section className="section audience-section"><SectionTitle eyebrow="Built for the first two users" title="Different work. The same disciplined method."/><div className="audience-grid"><article><div className="audience-icon"><BookOpen /></div><span className="eyebrow">For professors</span><h3>Spend less time rebuilding the machinery of teaching.</h3><ul><li>Lecture preparation</li><li>Course material organization</li><li>Meeting follow-up</li><li>Feedback preparation</li></ul><button onClick={() => go("/workflows")}>Explore professor workflows <ArrowRight /></button></article><article><div className="audience-icon"><GraduationCap /></div><span className="eyebrow">For students</span><h3>Turn scattered commitments into clear next actions.</h3><ul><li>Weekly academic planning</li><li>Assignment breakdown</li><li>Research organization</li><li>Project workflows</li></ul><button onClick={() => go("/workflows")}>Explore student workflows <ArrowRight /></button></article></div></section>
      <section className="section boundary"><div><ShieldCheck /><span className="eyebrow">Human judgment is a feature</span><h2>AI drafts. People decide.</h2><p>Workflow Lab identifies where AI can accelerate routine work and where accuracy, privacy, or responsibility requires a person. Every redesigned workflow includes explicit review checkpoints.</p></div><ul><li><Check /> No autonomous grading</li><li><Check /> No sensitive student data in unapproved tools</li><li><Check /> No guaranteed outcomes or time savings</li><li><Check /> No replacement for academic judgment</li></ul></section>
      <section className="final-cta"><span className="eyebrow">Start with one task</span><h2>What work do you repeat every week?</h2><p>Describe the current process. See what a clearer version could look like.</p><LinkButton to="/intake" go={go}>Analyze a workflow <ArrowRight /></LinkButton></section>
    </main>
  </>;
}

function HowItWorks({ go }: { go: (to: Route) => void }) {
  const stages = [
    ["Capture", "Reconstruct the task from its trigger to its final output.", ["Inputs and tools", "Current steps and time", "Pain points and decisions"]],
    ["Diagnose", "Evaluate each step with a consistent framework.", ["Repetition and time cost", "Cognitive load and error risk", "Automation fit and human judgment"]],
    ["Redesign", "Create an executable process, not a list of suggestions.", ["Defined input and output", "One named tool", "Review and failure conditions"]],
    ["Implement", "Provide the assets that make the new process repeatable.", ["Templates and instructions", "Checklists and naming rules", "AI prompts where appropriate"]],
    ["Measure", "Compare the estimate with actual use and revise.", ["Time and steps", "Corrections required", "Independent repeatability"]],
  ];
  return <main><section className="page-hero"><span className="eyebrow">Our method</span><h1>Improve the process you have before adding more technology.</h1><p>Workflow Lab uses a disciplined five-stage method to turn a recurring task into a reliable operating guide.</p></section><section className="section method-list">{stages.map(([name, copy, items], i) => <article key={String(name)}><span className="stage-num">0{i + 1}</span><div><h2>{String(name)}</h2><p>{String(copy)}</p></div><ul>{(items as string[]).map(x => <li key={x}><Check />{x}</li>)}</ul></article>)}</section><section className="section tinted"><SectionTitle eyebrow="Classification framework" title="Every step gets one primary treatment."/><div className="classification-grid">{[["Eliminate","Remove work that has no clear purpose."],["Simplify","Reduce choices, handoffs, or unnecessary complexity."],["Standardize","Use the same sequence and location each time."],["Template","Stop recreating a repeated output."],["Automate","Use reliable rules for predictable digital work."],["AI-assist","Generate a first pass with required human review."],["Human-only","Keep accountable judgment with a person."]].map(([t,c]) => <article key={t}><h3>{t}</h3><p>{c}</p></article>)}</div></section><section className="final-cta small"><h2>See the method on a real example.</h2><LinkButton to="/sample-result" go={go}>Open the lecture workflow <ArrowRight /></LinkButton></section></main>;
}

function Workflows({ go }: { go: (to: Route) => void }) {
  return <main><section className="page-hero"><span className="eyebrow">Workflow library</span><h1>Start with a task you already repeat.</h1><p>Two workflows are developed for the prototype. The rest show where the same method could go next.</p></section><section className="section workflow-library">{workflowCards.map((card, i) => <article key={card.title} className={!card.ready ? "concept" : ""}><div className="library-top"><span className="audience-pill">{card.audience}</span><span className={card.ready ? "status ready" : "status"}>{card.ready ? "Prototype ready" : "Future concept"}</span></div><div className="library-icon">{i === 0 ? <BookOpen /> : i === 1 ? <CalendarDays /> : <Workflow />}</div><h2>{card.title}</h2><p>{card.description}</p>{card.ready && <button onClick={() => go(i === 0 ? "/sample-result" : "/demo")}>View workflow <ArrowRight /></button>}</article>)}</section></main>;
}

function Demo({ go }: { go: (to: Route) => void }) {
  const [choice, setChoice] = useState<"lecture" | "student">("lecture");
  const pkg = useMemo(() => generatePackage(choice === "lecture" ? lectureIntake : studentIntake), [choice]);
  return <main><section className="page-hero"><span className="eyebrow">Interactive prototype</span><h1>See how a workflow is diagnosed.</h1><p>Select an example to explore a structured, locally generated analysis. All benefits shown are prototype estimates.</p></section><section className="section demo-layout"><aside className="demo-picker"><span className="field-label">I want to improve</span><button className={choice === "lecture" ? "selected" : ""} onClick={() => setChoice("lecture")}><BookOpen /> Lecture preparation <Check /></button><button className={choice === "student" ? "selected" : ""} onClick={() => setChoice("student")}><CalendarDays /> Weekly planning <Check /></button><div className="estimate-note"><ShieldCheck /><p><b>Estimates, not promises.</b><br/>Real impact is measured after the user runs the workflow.</p></div></aside><DemoResult pkg={pkg} /></section><section className="final-cta small"><h2>Ready to map your own process?</h2><LinkButton to="/intake" go={go}>Start the intake <ArrowRight /></LinkButton></section></main>;
}

function DemoResult({ pkg }: { pkg: WorkflowPackage }) {
  return <div className="demo-result"><div className="result-heading"><div><span className="eyebrow">Analysis preview</span><h2>{pkg.metadata.workflowName}</h2></div><span className="version">v{pkg.version}</span></div><p>{pkg.summary}</p><div className="metric-cards"><article><span>Current time</span><b>{pkg.baseline.estimatedTimeMinutes}<small> min</small></b></article><article><span>Current steps</span><b>{pkg.baseline.numberOfSteps}</b></article><article className="target"><span>Target estimate</span><b>{pkg.measurement.targetTimeMinutes}<small> min</small></b></article></div><h3>Highest-priority changes</h3><div className="priority-list">{pkg.priorityImprovements.map((item, i) => <article key={item.id}><span>0{i + 1}</span><div><b>{item.description}</b><p>{item.recommendation}</p></div><em>{item.classification.replace("_", " ")}</em></article>)}</div><h3>Redesigned flow</h3><div className="mini-flow">{pkg.improvedWorkflow.map((step) => <span key={step.order}>{step.order}. {step.title}</span>)}</div><div className="review-bar"><ShieldCheck /><div><b>{pkg.improvedWorkflow.filter(s => s.humanReview.trim()).length} explicit human review points</b><small>Accuracy and responsibility remain with the user.</small></div></div></div>;
}

const intakeStages = ["About you", "Workflow", "Trigger & frequency", "Current steps", "Tools & inputs", "Pain points", "Risk & judgment", "Success", "Review"];
const split = (v: string) => v.split(/,|\n/).map(x => x.trim()).filter(Boolean);

function readStoredIntake(): WorkflowIntake {
  try {
    const stored = localStorage.getItem("workflow-lab-intake");
    return stored ? { ...initialIntake, ...JSON.parse(stored) } : initialIntake;
  } catch {
    localStorage.removeItem("workflow-lab-intake");
    return initialIntake;
  }
}

function Intake({ go }: { go: (to: Route) => void }) {
  const [data, setData] = useState<WorkflowIntake>(readStoredIntake);
  const [stage, setStage] = useState(0); const [errors, setErrors] = useState<string[]>([]); const [generated, setGenerated] = useState<WorkflowPackage | null>(null); const [storageWarning, setStorageWarning] = useState("");
  useEffect(() => { try { localStorage.setItem("workflow-lab-intake", JSON.stringify(data)); setStorageWarning(""); } catch { setStorageWarning("This browser could not save the draft. You can still complete and download it during this session."); } }, [data]);
  const set = <K extends keyof WorkflowIntake>(key: K, value: WorkflowIntake[K]) => setData(d => ({ ...d, [key]: value }));
  const updateStep = (id: string, patch: Partial<WorkflowStep>) => setData(d => ({ ...d, currentSteps: d.currentSteps.map(s => s.id === id ? { ...s, ...patch } : s) }));
  const reorder = (index: number, direction: -1 | 1) => setData(d => ({ ...d, currentSteps: moveWorkflowStep(d.currentSteps, index, direction) }));
  const submit = (event: FormEvent) => { event.preventDefault(); const check = validateIntake(data); setErrors(check.errors); if (check.valid) { try { localStorage.setItem("workflow-lab-intake", JSON.stringify(data)); } catch { setStorageWarning("This browser could not save the draft. Download the JSON now to keep a copy."); } try { setGenerated(generatePackage(data)); } catch (error) { setErrors(error instanceof Error ? error.message.split("\n") : ["The workflow package could not be generated."]); } } };
  const downloadFile = (contents: string, filename: string) => { const blob = new Blob([contents], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url); };
  const downloadIntake = () => downloadFile(serializeIntake(data), intakeDownloadName(data.workflowName));
  const downloadPackage = () => generated && downloadFile(serializeWorkflowPackage(generated), workflowPackageDownloadName(data.workflowName));
  if (generated) return <main className="result-page generated-result"><section className="result-hero"><div><span className="eyebrow">Workflow package ready</span><h1>{generated.metadata.workflowName}</h1><p>Your diagnosis, redesigned sequence, reusable assets, review points, and first-run measurement plan were generated in this browser.</p></div><div className="generated-actions"><button className="button primary" onClick={downloadPackage}><Download/> Download package</button><button className="button secondary" onClick={downloadIntake}>Download intake</button></div></section>{storageWarning && <div className="form-errors generated-warning" role="alert"><span>{storageWarning}</span></div>}<div className="local-generation-note"><ShieldCheck/><div><b>Local prototype generation</b><p>No information was sent to a server or AI provider. The package contains AI-assisted instructions for optional use in an institution-approved tool; every AI draft requires human review.</p></div></div><section className="section generated-overview"><DemoResult pkg={generated}/></section><section className="section result-content generated-detail"><RedesignTab pkg={generated}/></section><section className="section result-content generated-detail tinted"><AssetsTab pkg={generated}/></section><section className="section result-content generated-detail"><MeasurementTab pkg={generated}/></section><CorrectionLoop pkg={generated} onApprove={setGenerated}/><section className="final-cta small"><h2>Test it on one real, low-risk run.</h2><p>Record actual time, corrections, usefulness, and any step that needs help before treating the package as proven.</p><button className="button secondary" onClick={() => { setGenerated(null); setStage(8); }}>Revise the intake</button></section></main>;
  return <main><section className="intake-shell"><div className="intake-intro"><span className="eyebrow">Workflow intake</span><h1>Map one recurring task.</h1><p>Describe what actually happens today. Imperfect detail is more useful than an idealized process.</p><div className="progress-list">{intakeStages.map((name, i) => <button type="button" key={name} onClick={() => i <= stage && setStage(i)} className={i === stage ? "active" : i < stage ? "done" : ""}><span>{i < stage ? <Check /> : i + 1}</span>{name}</button>)}</div><div className="privacy-note"><ShieldCheck/><p><b>Prototype privacy</b><br/>Your draft is stored in this browser only. Avoid entering confidential or identifiable student information.</p></div>{storageWarning && <div className="form-errors" role="alert"><span>{storageWarning}</span></div>}</div><form className="intake-form" onSubmit={submit}><div className="form-heading"><span>Step {stage + 1} of {intakeStages.length}</span><h2>{intakeStages[stage]}</h2></div>{stage === 0 && <Choice label="Your role" value={data.userRole} onChange={v => set("userRole", v)} options={["Professor", "Student", "Researcher", "Other"]}/>} {stage === 1 && <><Field label="Workflow name" value={data.workflowName} onChange={v => set("workflowName", v)} placeholder="e.g. Prepare my weekly lecture"/><Field label="What must this workflow produce?" value={data.objective} onChange={v => set("objective", v)} multiline placeholder="Describe a clear outcome…"/></>} {stage === 2 && <><div className="two-fields"><Field label="What triggers it?" value={data.trigger} onChange={v => set("trigger", v)} placeholder="e.g. Previous class ends"/><Field label="How often?" value={data.frequency} onChange={v => set("frequency", v)} placeholder="e.g. Weekly"/></div><Field label="Current total time (minutes)" type="number" value={String(data.currentTimeMinutes)} onChange={v => set("currentTimeMinutes", Number(v))}/></>} {stage === 3 && <div className="steps-editor">{data.currentSteps.map((step, i) => <article key={step.id}><div className="step-editor-top"><span>Step {i + 1}</span><div><button type="button" aria-label="Move up" onClick={() => reorder(i,-1)}><MoveUp/></button><button type="button" aria-label="Move down" onClick={() => reorder(i,1)}><MoveDown/></button>{data.currentSteps.length > 1 && <button type="button" aria-label="Remove" onClick={() => set("currentSteps", removeWorkflowStep(data.currentSteps, step.id))}><Trash2/></button>}</div></div><Field label="What do you do?" value={step.description} onChange={v => updateStep(step.id,{description:v})} placeholder="Describe the action"/><div className="two-fields"><Field label="Tool" value={step.tool} onChange={v => updateStep(step.id,{tool:v})}/><Field label="Minutes" type="number" value={String(step.estimatedMinutes)} onChange={v => updateStep(step.id,{estimatedMinutes:Number(v)})}/></div><Field label="Inputs (comma separated)" value={step.inputs.join(", ")} onChange={v => updateStep(step.id,{inputs:split(v)})}/><Field label="Output" value={step.output} onChange={v => updateStep(step.id,{output:v})}/><Field label="Pain points (comma separated)" value={step.painPoints.join(", ")} onChange={v => updateStep(step.id,{painPoints:split(v)})}/><Field label="Decisions required (comma separated)" value={step.decisionsRequired.join(", ")} onChange={v => updateStep(step.id,{decisionsRequired:split(v)})}/><div className="check-row"><label className="check-field"><input type="checkbox" checked={step.repeated} onChange={e => updateStep(step.id,{repeated:e.target.checked})}/><span>This action repeats</span></label><label className="check-field"><input type="checkbox" checked={step.humanReviewMandatory} onChange={e => updateStep(step.id,{humanReviewMandatory:e.target.checked})}/><span>Human review is mandatory</span></label></div></article>)}<button type="button" className="add-step" onClick={() => set("currentSteps", appendWorkflowStep(data.currentSteps, emptyStep()))}><Plus/> Add another step</button></div>} {stage === 4 && <><Field label="Tools used (comma separated)" value={data.tools.join(", ")} onChange={v => set("tools",split(v))} placeholder="Google Drive, PowerPoint, Calendar…"/><Field label="Inputs needed" value={data.inputs.join(", ")} onChange={v => set("inputs",split(v))} multiline/><Field label="Desired outputs" value={data.desiredOutputs.join(", ")} onChange={v => set("desiredOutputs",split(v))} multiline/></>} {stage === 5 && <><Field label="Main frustrations" value={data.majorFrustrations.join(", ")} onChange={v => set("majorFrustrations",split(v))} multiline/><Field label="Repeated actions" value={data.repeatedActions.join(", ")} onChange={v => set("repeatedActions",split(v))} multiline/></>} {stage === 6 && <><Field label="What decisions require a person?" value={data.humanJudgmentRequired.join(", ")} onChange={v => set("humanJudgmentRequired",split(v))} multiline placeholder="Accuracy, teaching suitability, final approval…"/><Field label="Sensitive-information considerations" value={data.sensitiveInformation} onChange={v => set("sensitiveInformation",v)} multiline placeholder="Write none if this workflow uses no sensitive information."/><div className="form-callout"><ShieldCheck/><p>{product.name} does not recommend automating accountable academic decisions. AI-assisted steps must have a defined reviewer.</p></div></>} {stage === 7 && <><Field label="What would make this redesign successful?" value={data.successDefinition} onChange={v => set("successDefinition",v)} multiline/><Field label="What improvement do you hope to see?" value={data.desiredImprovement} onChange={v => set("desiredImprovement",v)} multiline/></>} {stage === 8 && <Review data={data}/>} {errors.length > 0 && stage === 8 && <div className="form-errors" role="alert"><b>Complete these items:</b>{errors.map(e => <span key={e}>{e}</span>)}</div>}<div className="form-actions">{stage > 0 ? <button type="button" className="button secondary" onClick={() => setStage(stage-1)}><ChevronLeft/> Back</button> : <span/>}{stage < intakeStages.length-1 ? <button type="button" className="button primary" onClick={() => setStage(stage+1)}>Continue <ChevronRight/></button> : <button className="button primary" type="submit">Generate workflow package <Sparkles/></button>}</div></form></section></main>;
}

const feedbackCategories: Array<{ value: FeedbackCategory; label: string }> = [
  { value: "accuracy", label: "Accuracy or unsupported content" },
  { value: "clarity", label: "Instruction was unclear" },
  { value: "missing_input", label: "Required input was missing" },
  { value: "tool_fit", label: "Tool was unavailable or unsuitable" },
  { value: "time", label: "Step took too long" },
  { value: "other", label: "Another unmet need" },
];

function CorrectionLoop({ pkg, onApprove }: { pkg: WorkflowPackage; onApprove: (pkg: WorkflowPackage) => void }) {
  const [feedback, setFeedback] = useState<WorkflowFeedback>({
    failedStepOrder: pkg.improvedWorkflow[0]?.order ?? 1,
    category: "clarity",
    report: "",
    desiredOutcome: "",
    usefulnessRating: 3,
    actualTimeMinutes: null,
    correctionCount: 0,
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [draft, setDraft] = useState<WorkflowRevisionDraft | null>(null);
  const [notice, setNotice] = useState("");
  const setFeedbackField = <K extends keyof WorkflowFeedback>(key: K, value: WorkflowFeedback[K]) => setFeedback((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validateWorkflowFeedback(feedback, pkg);
    setErrors(nextErrors);
    setNotice("");
    if (nextErrors.length) return;
    try { setDraft(draftWorkflowRevision(pkg, feedback)); } catch (error) { setErrors(error instanceof Error ? error.message.split("\n") : ["The correction draft could not be created."]); }
  };
  const approve = () => {
    if (!draft) return;
    const approved = approveWorkflowRevision(draft);
    onApprove(approved.package);
    setDraft(null);
    setNotice(`Revision ${approved.package.version} is now the active package. The previous package was not changed until this approval.`);
  };
  const selectedOriginal = pkg.improvedWorkflow.find((step) => step.order === feedback.failedStepOrder);
  const selectedDraft = draft?.proposedPackage.improvedWorkflow.find((step) => step.order === feedback.failedStepOrder);

  return <section className="section result-content generated-detail correction-loop" aria-labelledby="correction-heading">
    <SectionTitle eyebrow="Failure-to-correction loop" title="Report what did not meet your need." copy="A correction is drafted for one failed step. The active workflow stays unchanged until a person reviews and approves it."/>
    <div className="prototype-boundary"><ShieldCheck/><p><b>Prototype boundary:</b> this draft is created locally with transparent rules, not an external AI provider. It tests the complaint, review, and approval experience without storing the report or changing privacy behavior.</p></div>
    {notice && <div className="approval-notice" role="status"><Check/><span>{notice}</span></div>}
    {!draft ? <form className="feedback-form" onSubmit={submit}>
      <div className="feedback-grid">
        <label className="field"><span>Usefulness after this run</span><select value={feedback.usefulnessRating} onChange={(event) => setFeedbackField("usefulnessRating", Number(event.target.value))}>{[1,2,3,4,5].map((rating) => <option value={rating} key={rating}>{rating} / 5</option>)}</select></label>
        <label className="field"><span>Step that failed</span><select value={feedback.failedStepOrder} onChange={(event) => setFeedbackField("failedStepOrder", Number(event.target.value))}>{pkg.improvedWorkflow.map((step) => <option value={step.order} key={step.order}>{step.order}. {step.title}</option>)}</select></label>
        <label className="field"><span>Failure type</span><select value={feedback.category} onChange={(event) => setFeedbackField("category", event.target.value as FeedbackCategory)}>{feedbackCategories.map((category) => <option value={category.value} key={category.value}>{category.label}</option>)}</select></label>
        <label className="field"><span>Corrections you made</span><input type="number" min="0" value={feedback.correctionCount} onChange={(event) => setFeedbackField("correctionCount", Number(event.target.value))}/></label>
        <label className="field"><span>Actual total time (optional)</span><input type="number" min="1" value={feedback.actualTimeMinutes ?? ""} onChange={(event) => setFeedbackField("actualTimeMinutes", event.target.value ? Number(event.target.value) : null)} placeholder="Minutes"/></label>
      </div>
      <Field label="What happened?" value={feedback.report} onChange={(value) => setFeedbackField("report", value)} multiline placeholder="Describe the point where the workflow failed, became unclear, or produced the wrong result."/>
      <Field label="What would meet your need instead?" value={feedback.desiredOutcome} onChange={(value) => setFeedbackField("desiredOutcome", value)} multiline placeholder="State the result the corrected step must produce."/>
      {errors.length > 0 && <div className="form-errors" role="alert"><b>Complete these items:</b>{errors.map((error) => <span key={error}>{error}</span>)}</div>}
      <button className="button primary" type="submit"><RefreshCw/> Draft a correction</button>
    </form> : <div className="revision-review">
      <div className="revision-status"><span className="status ready">Pending human approval</span><b>Original v{draft.originalVersion} remains active</b><p>The correction changes only step {feedback.failedStepOrder}. Review the proposed action, approval check, and safe fallback before replacing the package.</p></div>
      <div className="revision-compare">
        <article><span className="card-label">CURRENT APPROVED STEP</span><h3>{selectedOriginal?.title}</h3><p><b>Action</b>{selectedOriginal?.action}</p><p><b>Human review</b>{selectedOriginal?.humanReview}</p><p><b>Failure condition</b>{selectedOriginal?.failureCondition}</p></article>
        <article><span className="card-label">PROPOSED REVISION {draft.proposedPackage.version}</span><h3>{selectedDraft?.title}</h3><p><b>Action</b>{selectedDraft?.action}</p><p><b>Human review</b>{selectedDraft?.humanReview}</p><p><b>Failure condition</b>{selectedDraft?.failureCondition}</p></article>
      </div>
      <div className="revision-actions"><button className="button primary" type="button" onClick={approve}><Check/> Approve and replace package</button><button className="button secondary" type="button" onClick={() => setDraft(null)}>Keep current package</button></div>
    </div>}
  </section>;
}

function Field({ label, value, onChange, placeholder = "", multiline = false, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean; type?: string }) {
  return <label className="field"><span>{label}</span>{multiline ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}/> : <input type={type} min={type === "number" ? 1 : undefined} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}/>}</label>;
}
function Choice({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) { return <fieldset className="choice"><legend>{label}</legend><div>{options.map(x => <button type="button" className={value===x?"selected":""} key={x} onClick={() => onChange(x)}>{x}{value===x&&<Check/>}</button>)}</div></fieldset>; }
function Review({ data }: { data: WorkflowIntake }) { return <div className="review-card"><span className="audience-pill">{data.userRole||"Role not set"}</span><h3>{data.workflowName||"Workflow not named"}</h3><p>{data.objective||"Objective not set"}</p><div className="review-metrics"><span><Clock3/><b>{data.currentTimeMinutes}</b> minutes</span><span><Workflow/><b>{data.currentSteps.length}</b> steps</span><span><RefreshCw/><b>{data.frequency}</b></span></div><h4>Current steps</h4><ol>{data.currentSteps.map(s=><li key={s.id}>{s.description||"Incomplete step"}<small>{s.estimatedMinutes} min · {s.tool||"Tool not set"}</small></li>)}</ol><h4>Success means</h4><p>{data.successDefinition||"Not defined"}</p></div>; }

function SampleResult({ go }: { go: (to: Route) => void }) {
  const pkg = useMemo(() => generatePackage(lectureIntake), []);
  const [tab,setTab]=useState("Overview"); const tabs=["Overview","Diagnosis","Redesigned workflow","Assets","Measurement"];
  return <main className="result-page"><section className="result-hero"><div><span className="eyebrow">Complete sample result</span><h1>Lecture preparation</h1><p>A reusable, human-reviewed workflow for turning course inputs into a complete teaching package.</p></div><button className="button secondary" onClick={() => print()}><Download/> Print or save PDF</button></section><div className="result-meta"><span><GraduationCap/> University professor</span><span><RefreshCw/> Weekly</span><span><ShieldCheck/> Human-reviewed</span><em>Prototype estimates</em></div><nav className="result-tabs">{tabs.map(t=><button className={tab===t?"active":""} key={t} onClick={()=>setTab(t)}>{t}</button>)}</nav><section className="section result-content">{tab==="Overview"&&<OverviewTab pkg={pkg}/>} {tab==="Diagnosis"&&<DiagnosisTab pkg={pkg}/>} {tab==="Redesigned workflow"&&<RedesignTab pkg={pkg}/>} {tab==="Assets"&&<AssetsTab pkg={pkg}/>} {tab==="Measurement"&&<MeasurementTab pkg={pkg}/>}</section><section className="final-cta small"><h2>What would this look like for your work?</h2><LinkButton to="/intake" go={go}>Analyze your workflow <ArrowRight/></LinkButton></section></main>;
}
function OverviewTab({pkg}:{pkg:WorkflowPackage}){return <><div className="result-summary"><span className="eyebrow">Executive summary</span><h2>A strong candidate for standardization and assisted drafting.</h2><p>{pkg.summary}</p></div><div className="big-metrics"><article><span>Before</span><b>{pkg.baseline.estimatedTimeMinutes}<small> min</small></b><p>{pkg.baseline.numberOfSteps} loosely defined steps</p></article><ArrowRight/><article className="improved"><span>Redesigned target</span><b>{pkg.measurement.targetTimeMinutes}<small> min*</small></b><p>{pkg.improvedWorkflow.length} defined, reviewable steps</p></article></div><Transformation compact/><div className="result-summary"><span className="eyebrow">Prioritized changes</span><div className="priority-list">{pkg.priorityImprovements.map((item,i)=><article key={item.id}><span>0{i+1}</span><div><b>{item.description}</b><p>{item.recommendation}</p></div><em>{item.classification.replace("_"," ")}</em></article>)}</div></div><div className="risk-panel"><ShieldCheck/><div><h3>Responsibility stays with the professor</h3><p>{pkg.riskNotes.join(" ")} The professor approves learning objectives, academic claims, student-level fit, and the final teaching package.</p></div></div></>}
function DiagnosisTab({pkg}:{pkg:WorkflowPackage}){return <><SectionTitle eyebrow="Step-level diagnosis" title="Where effort and risk live in the current process."/><div className="diagnosis-table"><div className="table-head"><span>Current step</span><span>Minutes</span><span>Treatment</span><span>Opportunity</span></div>{pkg.diagnosis.map(s=><div className="table-row" key={s.id}><span><b>{s.order}. {s.description}</b><small>{s.painPoints.join(" · ")}</small></span><span>{s.estimatedMinutes}</span><span><em>{s.classification.replace("_"," ")}</em></span><span>{s.opportunityScore}</span></div>)}</div></>}
function RedesignTab({pkg}:{pkg:WorkflowPackage}){return <><SectionTitle eyebrow="Operating guide" title="A sequence the user can actually run."/><div className="operating-steps">{pkg.improvedWorkflow.map(s=><article key={s.order}><span className="op-num">{String(s.order).padStart(2,"0")}</span><div><span className="status ready">{s.classification.replace("_"," ")}</span><h3>{s.title}</h3><div className="op-grid"><p><b>Input</b>{s.input}</p><p><b>Action</b>{s.action}</p><p><b>Tool</b>{s.tool}</p><p><b>Output</b>{s.output}</p><p><b>AI involvement</b>{s.aiInvolvement}</p><p><b>Human review</b>{s.humanReview}</p></div><small><Clock3/> Target: {s.estimatedMinutes} minutes · {s.failureCondition}</small></div></article>)}</div></>}
function AssetsTab({pkg}:{pkg:WorkflowPackage}){return <><SectionTitle eyebrow="Reusable assets" title="The pieces that prevent starting over."/><div className="asset-grid">{pkg.assets.map(a=><article key={a.name}><span>{a.kind}</span><h3>{a.name}</h3><pre>{a.content}</pre></article>)}</div></>}
function MeasurementTab({pkg}:{pkg:WorkflowPackage}){return <><SectionTitle eyebrow="Evaluation plan" title="Test the redesign against real work."/><div className="measure-grid"><article><Gauge/><h3>Record the actual time</h3><p>Track each step separately. Compare the total with the {pkg.measurement.baselineTimeMinutes}-minute baseline.</p></article><article><FileCheck2/><h3>Count corrections</h3><p>Note factual, structural, and teaching-quality changes required after drafts.</p></article><article><RefreshCw/><h3>Test repeatability</h3><p>Run the workflow again without setup help. Record where instructions fail.</p></article></div><div className="question-list"><h3>After each run, ask:</h3>{pkg.measurement.reviewQuestions.map(q=><p key={q}><Check/>{q}</p>)}</div></>}

export function App() { const [route,go]=useRoute(); return <div className="app"><Header route={route} go={go}/>{route==="/"&&<Home go={go}/>} {route==="/how-it-works"&&<HowItWorks go={go}/>} {route==="/workflows"&&<Workflows go={go}/>} {route==="/demo"&&<Demo go={go}/>} {route==="/intake"&&<Intake go={go}/>} {route==="/sample-result"&&<SampleResult go={go}/>}<Footer go={go}/></div>; }
