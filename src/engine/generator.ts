import type { DiagnosedStep, ImprovedStep, WorkflowAsset, WorkflowIntake, WorkflowPackage } from "../types";
import { classifyStep, opportunityScore, scoreStep } from "./scoring";
import { validateIntake } from "./validation";

const recommendations: Record<DiagnosedStep["classification"], string> = {
  ELIMINATE: "Remove this step unless it has a documented purpose.",
  SIMPLIFY: "Reduce choices and define one clear path to the output.",
  STANDARDIZE: "Use the same location, naming rule, and sequence every time.",
  TEMPLATE: "Start from a reusable template instead of recreating the output.",
  AUTOMATE: "Use a reliable rule-based action and review exceptions.",
  AI_ASSIST: "Let AI create a first pass, then require a named human review.",
  HUMAN_ONLY: "Keep the decision with the user and provide a review checklist.",
};

type StepBlueprint = Omit<ImprovedStep, "order">;

const lectureBlueprints: StepBlueprint[] = [
  ["Create a standardized session workspace", "Course code, week, and session topic", "Create the session folder from the standard structure and apply the naming rule.", "Google Drive", "Named session workspace", "None; this is a rule-based setup step.", "Confirm the course, week, and access permissions.", 5, "Stop if the session identity or approved storage location is unclear.", "STANDARDIZE"],
  ["Collect source materials", "Syllabus, previous lecture, textbook chapter, and approved references", "Copy or link the required sources into the session workspace and record gaps.", "Google Drive", "Source manifest", "AI may summarize the manifest only after the professor supplies approved sources.", "Confirm every source is relevant and permitted for use.", 10, "Stop if a required source is missing or its provenance is unknown.", "STANDARDIZE"],
  ["Define learning objectives", "Syllabus outcomes and previous-session context", "Complete the learning-objective template with observable outcomes and scope boundaries.", "Documents", "Approved learning objectives", "AI may propose wording; it may not decide the teaching scope.", "The professor approves objectives and alignment with the course.", 10, "Stop if objectives cannot be tied to the syllabus.", "HUMAN_ONLY"],
  ["Generate the lecture brief", "Approved objectives and source manifest", "Run the lecture-brief instruction to draft prerequisites, concepts, likely misconceptions, and evidence to verify.", "Approved AI tool and Documents", "Lecture brief", "AI creates a source-grounded first draft and flags uncertainty.", "Verify every academic claim and remove material outside the course level.", 15, "Stop if the draft introduces unsupported claims.", "AI_ASSIST"],
  ["Create the lesson structure", "Approved objectives and lecture brief", "Allocate time to opening, explanation, examples, practice, discussion, and close.", "Documents", "Timed lesson structure", "AI may suggest an initial sequence; the professor selects the pedagogy.", "Confirm pacing, emphasis, and teaching sequence.", 12, "Stop if the plan exceeds the session length.", "AI_ASSIST"],
  ["Plan slides", "Timed lesson structure and source manifest", "Complete the slide-planning template with one purpose and evidence source per slide group.", "PowerPoint", "Slide plan and speaker-note outline", "AI may draft concise headings and notes from approved material.", "Review accuracy, accessibility, and cognitive load.", 25, "Stop if a slide cannot be traced to an approved source or objective.", "TEMPLATE"],
  ["Create an activity or discussion", "Learning objectives and lesson structure", "Use the activity template to define instructions, timing, expected response, and debrief.", "Documents", "Class activity", "AI may propose variants; it must not evaluate identifiable students.", "The professor approves feasibility, inclusivity, and alignment.", 12, "Stop if the activity does not support an objective.", "AI_ASSIST"],
  ["Adapt material to the student level", "Slide plan, activity, and cohort context", "Run the student-level checklist and revise terminology, examples, scaffolding, and assumed knowledge.", "Documents and PowerPoint", "Level-adjusted teaching package", "AI may flag jargon or missing explanations without using student records.", "The professor decides what is appropriate for the cohort.", 10, "Stop if adaptation would require identifiable student information.", "HUMAN_ONLY"],
  ["Review academic accuracy", "Complete draft and source manifest", "Verify claims, citations, examples, calculations, and distinctions between fact and interpretation.", "PowerPoint and source materials", "Accuracy-approved draft", "AI may produce a review checklist but cannot approve content.", "The professor performs and records final academic review.", 15, "Stop and return to the relevant step when a claim cannot be verified.", "HUMAN_ONLY"],
  ["Export the final teaching package", "Accuracy-approved draft", "Export slides, notes, activity instructions, and source manifest using the naming convention.", "PowerPoint and Google Drive", "Final teaching package", "None; export uses a standard checklist.", "Confirm files open correctly and only intended materials are shared.", 5, "Stop if permissions or exported files cannot be verified.", "STANDARDIZE"],
  ["Complete a post-class reflection", "Delivered session and teaching observations", "Record what worked, timing variance, misconceptions, and one change for the next run.", "Documents", "Post-class reflection", "AI may later summarize non-sensitive reflections across sessions.", "The professor decides which changes should carry forward.", 5, "Stop if reflection notes would expose identifiable student information.", "TEMPLATE"],
].map(([title, input, action, tool, output, aiInvolvement, humanReview, estimatedMinutes, failureCondition, classification]) => ({ title, input, action, tool, output, aiInvolvement, humanReview, estimatedMinutes, failureCondition, classification } as StepBlueprint));

const studentBlueprints: StepBlueprint[] = [
  ["Collect classes, commitments, and deadlines", "Course pages, email, calendar, and unfinished work", "Review each approved source once and record every dated commitment in the weekly intake.", "LMS, Email, and Calendar", "Complete weekly intake", "AI is not needed for collection; source links remain visible.", "The student confirms dates against official course sources.", 15, "Stop if a deadline is ambiguous and verify it with the instructor or syllabus.", "STANDARDIZE"],
  ["Identify assignments", "Complete weekly intake", "Separate assessed work, preparation, administration, and personal commitments.", "Notes", "Assignment and commitment list", "AI may group entries but cannot invent requirements.", "Confirm every assignment against its official instructions.", 5, "Stop if requirements or submission dates are missing.", "SIMPLIFY"],
  ["Break large assignments into smaller tasks", "Assignment instructions and rubric", "Use the decomposition template to create actions that can be completed in one work block.", "Notes", "Actionable task list", "AI may draft a decomposition from supplied instructions.", "The student verifies that every rubric requirement is covered.", 10, "Stop if the assignment instructions have not been provided.", "AI_ASSIST"],
  ["Estimate effort", "Actionable task list and prior experience", "Assign a low, expected, and high estimate to each task.", "Effort worksheet", "Ranged effort estimates", "AI may suggest a starting range; the student owns the estimate.", "Adjust estimates for personal pace and current capacity.", 8, "Stop if a task is still too vague to estimate.", "HUMAN_ONLY"],
  ["Identify dependencies", "Actionable task list", "Mark tasks that require another task, person, resource, or fixed event first.", "Notes", "Dependency-aware task list", "AI may flag language that suggests dependencies.", "Confirm external dependencies and lead times.", 5, "Stop if a prerequisite cannot be scheduled or obtained.", "SIMPLIFY"],
  ["Prioritize work", "Deadlines, effort ranges, dependencies, and course priorities", "Rank tasks by deadline risk, importance, dependency impact, and effort.", "Priority worksheet", "Prioritized task list", "AI may calculate a transparent first-pass order.", "The student makes the final priority decisions.", 8, "Stop if two priorities conflict and seek course guidance when needed.", "HUMAN_ONLY"],
  ["Create a realistic weekly schedule", "Prioritized task list and fixed commitments", "Place focused blocks with buffers, breaks, and no more than the available weekly capacity.", "Calendar", "Weekly schedule", "AI may propose a draft schedule without accessing private calendars.", "The student checks energy, accessibility needs, and feasibility.", 12, "Stop if planned work exceeds available capacity.", "AI_ASSIST"],
  ["Create daily starting actions", "Weekly schedule", "Write one small, concrete starting action for each scheduled work block.", "Notes or Calendar", "Daily kickoff list", "AI may rewrite vague tasks into concrete starting actions.", "Confirm each action matches the actual assignment.", 5, "Stop if an action cannot be started with available materials.", "TEMPLATE"],
  ["Review unfinished work", "Completed week and task status", "Use the missed-task recovery process to reschedule, reduce, renegotiate, or remove unfinished work.", "Notes", "Recovery decisions", "AI may present recovery options; it cannot make academic or health decisions.", "The student chooses a realistic recovery action.", 7, "Escalate to an instructor or support service when a deadline cannot be met.", "HUMAN_ONLY"],
  ["Update the following week", "Recovery decisions and observed timing", "Carry forward only active work and update future effort estimates with actuals.", "Weekly intake and Calendar", "Updated planning baseline", "AI may summarize timing differences from non-sensitive records.", "Confirm that completed or obsolete work is not carried forward.", 5, "Stop if the source of a carried-forward task is unclear.", "STANDARDIZE"],
].map(([title, input, action, tool, output, aiInvolvement, humanReview, estimatedMinutes, failureCondition, classification]) => ({ title, input, action, tool, output, aiInvolvement, humanReview, estimatedMinutes, failureCondition, classification } as StepBlueprint));

export function diagnose(intake: WorkflowIntake): DiagnosedStep[] {
  return intake.currentSteps.map((step) => {
    const scores = scoreStep(step, intake.currentTimeMinutes);
    const classification = classifyStep(step, scores);
    return { ...step, classification, scores, opportunityScore: opportunityScore(scores), recommendation: recommendations[classification] };
  });
}

function improve(steps: DiagnosedStep[]): ImprovedStep[] {
  return steps.filter((step) => step.classification !== "ELIMINATE").map((step, index) => ({
    order: index + 1,
    title: step.description,
    input: step.inputs.join(", ") || "Required source material",
    action: `${step.recommendation} Complete: ${step.description.toLowerCase()}.`,
    tool: step.tool || "Existing tools",
    output: step.output || "A defined, reviewable output",
    aiInvolvement: ["AI_ASSIST"].includes(step.classification)
      ? "AI produces a first pass from user-supplied inputs; a person reviews before use."
      : "No generative AI is required for this step.",
    humanReview: step.humanReviewMandatory || ["AI_ASSIST", "HUMAN_ONLY"].includes(step.classification)
      ? `Confirm ${step.decisionsRequired.join(", ").toLowerCase() || "accuracy and fitness for purpose"}.`
      : "Check that the expected output exists before continuing.",
    estimatedMinutes: Math.max(3, Math.round(step.estimatedMinutes * (["TEMPLATE", "AUTOMATE", "AI_ASSIST"].includes(step.classification) ? 0.55 : 0.75))),
    failureCondition: "Stop if required inputs are missing or the output cannot be verified.",
    classification: step.classification,
  }));
}

function redesignedWorkflow(intake: WorkflowIntake, diagnosis: DiagnosedStep[]): ImprovedStep[] {
  const isLecture = /lecture/i.test(intake.workflowName) && /professor/i.test(intake.userRole);
  const isStudentPlan = /(academic week|weekly)/i.test(intake.workflowName) && /student/i.test(intake.userRole);
  const blueprints = isLecture ? lectureBlueprints : isStudentPlan ? studentBlueprints : null;
  return blueprints ? blueprints.map((step, index) => ({ ...step, order: index + 1 })) : improve(diagnosis);
}

function assets(intake: WorkflowIntake): WorkflowAsset[] {
  const generic: WorkflowAsset[] = [
    { name: "Workflow kickoff", kind: "template", content: `Objective: ${intake.objective}\nInputs ready:\nDecisions needed:\nDefinition of done: ${intake.successDefinition}` },
    { name: "AI first-pass instruction", kind: "prompt", content: `Help me complete one step in ${intake.workflowName}. Use only the supplied material. State assumptions, flag missing information, and do not invent facts. Return a structured draft for human review.` },
    { name: "Final quality review", kind: "checklist", content: `- The objective is satisfied\n- Claims and calculations are verified\n- Sensitive information was handled appropriately\n- Required human decisions were made\n- Outputs are saved in the agreed location` },
  ];
  if (/lecture/i.test(intake.workflowName)) return [
    { name: "Session folder structure", kind: "template", content: "COURSE/week-NN-topic/\n  01-sources/\n  02-lecture-brief/\n  03-slides/\n  04-activity/\n  05-final/\n  06-reflection/" },
    { name: "Learning-objective template", kind: "template", content: "By the end of the session, students can [observable action] [concept] under [conditions].\nSyllabus alignment:\nOut of scope:" },
    { name: "Lecture brief template", kind: "template", content: "Approved objectives:\nPrerequisite knowledge:\nCore concepts:\nLikely misconceptions:\nEvidence and sources to verify:\nTerms requiring explanation:" },
    { name: "Slide-planning template", kind: "template", content: "Section purpose | Objective | Core claim | Evidence/source | Visual/example | Speaker note | Minutes" },
    { name: "Class-activity template", kind: "template", content: "Objective:\nStudent instructions:\nTime:\nExpected response:\nDebrief prompt:\nAccessibility alternative:" },
    { name: "Student-level adaptation", kind: "checklist", content: "- Prerequisites are stated\n- Jargon is defined\n- Examples match course level\n- Scaffolding precedes independent work\n- No identifiable student data is used" },
    { name: "Academic review", kind: "checklist", content: "- Claims trace to approved sources\n- Citations and calculations are verified\n- Fact and interpretation are distinguished\n- Objectives, activity, and assessment align\n- Final files and permissions are checked" },
    { name: "Post-class reflection", kind: "template", content: "Actual timing:\nConcepts needing clarification:\nActivity outcome:\nWhat to reuse:\nOne change for next time:\nSensitive details removed: yes/no" },
    { name: "Lecture-brief instruction", kind: "prompt", content: "Using only the supplied approved sources and objectives, draft prerequisites, core concepts, likely misconceptions, and terms to explain. Cite the supplied source for each academic claim. Mark missing evidence as [VERIFY]. Do not infer student characteristics. Return a draft for professor review." },
  ];
  if (/student/i.test(intake.userRole)) return [
    { name: "Weekly intake", kind: "template", content: "Week of:\nFixed commitments:\nOfficial deadlines with source links:\nUnfinished work:\nAvailable work blocks:" },
    { name: "Assignment decomposition", kind: "template", content: "Assignment:\nDefinition of done:\nRubric requirements:\nTasks (30–90 minutes each):\nDependencies:\nFirst visible action:" },
    { name: "Effort estimation", kind: "template", content: "Task | Low estimate | Expected estimate | High estimate | Actual | Learning for next estimate" },
    { name: "Priority framework", kind: "checklist", content: "- Deadline risk\n- Academic importance\n- Dependency impact\n- Estimated effort\n- Consequence of delay" },
    { name: "Weekly plan", kind: "template", content: "Day | Fixed commitments | Focus block | Buffer | Daily starting action" },
    { name: "Daily kickoff", kind: "checklist", content: "- Open the required source\n- Read the task definition\n- Start the named first action\n- Set the planned stop point\n- Record status before switching" },
    { name: "Missed-task recovery", kind: "checklist", content: "Choose one: reschedule with a buffer; reduce scope within requirements; ask for clarification; renegotiate when appropriate; remove obsolete work. Never silently overload the next day." },
    { name: "End-of-week review", kind: "template", content: "Completed:\nUnfinished and why:\nActual vs expected effort:\nDeadline risks:\nOne planning change for next week:" },
    { name: "Weekly plan quality review", kind: "checklist", content: "- Every deadline traces to an official source\n- Large assignments have concrete next actions\n- Dependencies are scheduled first\n- Planned work fits available capacity\n- Buffers and recovery time are present\n- Private information is excluded from unapproved tools" },
    { name: "Planning first-pass instruction", kind: "prompt", content: "Using only the supplied assignment instructions, deadlines, fixed commitments, and available work blocks, draft a weekly plan. Show source dates, dependencies, effort ranges, buffers, and one daily starting action. Mark missing or conflicting information as [VERIFY]. Do not infer health, disability, or private circumstances. Return a draft for student review." },
  ];
  if (/professor|faculty|instructor/i.test(intake.userRole)) return [
    ...generic,
    { name: "Approved-tool and data-boundary preflight", kind: "checklist", content: "- Name the institutional policy or approved-tool source and date checked\n- Confirm each selected tool is permitted for this workflow\n- List data, student work, course IP, and research material that must not be entered\n- Confirm approved sources and permissions for every input\n- Name a manual or institution-approved fallback\n- Stop when tool approval, data classification, or source permission is unclear" },
    { name: "Academic decision record", kind: "template", content: "Workflow and run date:\nAccountable professor:\nLearning or academic objective that must not change:\nPolicy and approved-tool sources consulted:\nAI-assisted actions allowed:\nAI-assisted actions prohibited:\nEvidence reviewed:\nDecision and rationale:\nHuman approval recorded by / at:\nTrigger for revisiting this decision:" },
    { name: "Run evidence log", kind: "template", content: "Run date and representative task:\nBaseline minutes and basis:\nActual minutes by step:\nCorrections required:\nOperator help or unclear instructions:\nPolicy, privacy, or tool-fit conflicts:\nUsefulness (1-5) and reason:\nMost consequential failure:\nCorrection approved, rejected, or unsafe:\nResult on the next comparable run:\nWould use again / preferred purchase format / reason:" },
  ];
  return generic;
}

export function generatePackage(intake: WorkflowIntake): WorkflowPackage {
  const validation = validateIntake(intake);
  if (!validation.valid) throw new Error(validation.errors.join("\n"));
  const diagnosis = diagnose(intake);
  const improvedWorkflow = redesignedWorkflow(intake, diagnosis);
  const targetTimeMinutes = improvedWorkflow.reduce((sum, step) => sum + step.estimatedMinutes, 0);
  const priorityImprovements = [...diagnosis].sort((a, b) => b.opportunityScore - a.opportunityScore).slice(0, 3);
  return {
    version: "0.1", generatedAt: new Date().toISOString(),
    metadata: { workflowName: intake.workflowName, userRole: intake.userRole, objective: intake.objective, frequency: intake.frequency },
    summary: `${intake.workflowName} is slowed mainly by ${priorityImprovements.map((item) => item.description.toLowerCase()).join(", ")}. The redesign adds repeatable structure while preserving human judgment.`,
    baseline: { estimatedTimeMinutes: intake.currentTimeMinutes, numberOfSteps: intake.currentSteps.length, majorBottlenecks: priorityImprovements.length },
    diagnosis, priorityImprovements, improvedWorkflow, assets: assets(intake),
    exampleExecution: {
      scenario: /lecture/i.test(intake.workflowName)
        ? "Prepare the next first-year lecture using approved syllabus outcomes and one textbook chapter."
        : /student/i.test(intake.userRole)
          ? "Plan a week containing two classes, one assignment milestone, and an existing personal commitment."
          : `Run ${intake.workflowName} once with a representative low-risk task.`,
      inputs: intake.inputs,
      outputs: intake.desiredOutputs,
      observations: /lecture/i.test(intake.workflowName)
        ? [
            "Illustrative run: workspace and approved-source manifest were ready in 14 minutes.",
            "The AI-assisted lecture brief contained two claims marked [VERIFY]; the professor corrected both before slide planning.",
            "Illustrative total: 132 minutes, compared with the 240-minute user estimate; this is an example, not a measured product claim.",
            "The professor completed the academic review and retained all final teaching decisions.",
          ]
        : /student/i.test(intake.userRole)
          ? [
              "Illustrative run: nine official deadlines and commitments were captured with source links.",
              "One assignment was split into four work blocks, and the first draft schedule exceeded capacity by 90 minutes before student review.",
              "Illustrative total: 84 minutes, compared with the 100-minute user estimate; this is an example, not a measured product claim.",
              "The student made all priority and capacity decisions and added a recovery block.",
            ]
          : [
              "Record actual minutes for every step.",
              "Mark every correction required after AI-assisted drafts.",
              "Note any instruction that could not be followed without help.",
            ],
    },
    riskNotes: [
      "Review AI-assisted output for accuracy before use.",
      intake.sensitiveInformation || "Do not enter personal, confidential, or institution-restricted information into unapproved AI tools.",
    ],
    measurement: {
      baselineTimeMinutes: intake.currentTimeMinutes,
      targetTimeMinutes,
      baselineStepCount: intake.currentSteps.length,
      targetStepCount: improvedWorkflow.length,
      qualityIndicators: ["Required output is complete", "Human review finds no critical errors", "The user can repeat the workflow without assistance"],
      reviewQuestions: [
        "How many minutes did each step and the full workflow take?",
        "How many factual, structural, or scheduling corrections were required?",
        "Where did you stop, become uncertain, or need operator help?",
        "Rate the effort required from 1 (very low) to 5 (very high).",
        "Could you repeat the workflow next time without assistance? Why or why not?",
        "Which reusable asset helped, and what should change before the next run?",
      ],
    },
  };
}
