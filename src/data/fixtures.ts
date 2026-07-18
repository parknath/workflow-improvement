import type { WorkflowIntake } from "../types";

export const lectureIntake: WorkflowIntake = {
  workflowName: "Prepare a weekly lecture",
  userRole: "University professor",
  objective: "Create a clear 90-minute lecture for first-year students",
  trigger: "The previous class ends",
  frequency: "Weekly",
  currentTimeMinutes: 240,
  tools: ["Google Drive", "PowerPoint", "ChatGPT"],
  inputs: ["Course syllabus", "Previous slides", "Textbook chapter", "Reference material"],
  desiredOutputs: ["Lecture brief", "Slide plan", "Class activity", "Final teaching package"],
  currentSteps: [
    { id: "l1", order: 1, description: "Search old folders and gather source materials", tool: "Google Drive", inputs: ["Previous slides", "References"], output: "Source collection", estimatedMinutes: 35, painPoints: ["Files are stored inconsistently"], decisionsRequired: [], repeated: true, humanReviewMandatory: false },
    { id: "l2", order: 2, description: "Review the syllabus and define learning objectives", tool: "Documents", inputs: ["Course syllabus"], output: "Learning objectives", estimatedMinutes: 25, painPoints: ["Objectives are rewritten each week"], decisionsRequired: ["Appropriate scope for students"], repeated: true, humanReviewMandatory: true },
    { id: "l3", order: 3, description: "Recreate a lecture outline from source material", tool: "Documents", inputs: ["Source collection", "Learning objectives"], output: "Lecture outline", estimatedMinutes: 55, painPoints: ["Structure is rebuilt from scratch"], decisionsRequired: ["Teaching sequence"], repeated: true, humanReviewMandatory: true },
    { id: "l4", order: 4, description: "Draft slides and speaker notes", tool: "PowerPoint", inputs: ["Lecture outline"], output: "Slide deck draft", estimatedMinutes: 70, painPoints: ["Formatting and repeated writing"], decisionsRequired: ["Emphasis and examples"], repeated: true, humanReviewMandatory: true },
    { id: "l5", order: 5, description: "Create a class activity", tool: "Documents", inputs: ["Learning objectives"], output: "Class activity", estimatedMinutes: 25, painPoints: ["Hard to vary activities"], decisionsRequired: ["Suitability for student level"], repeated: true, humanReviewMandatory: true },
    { id: "l6", order: 6, description: "Review academic accuracy and teaching quality", tool: "PowerPoint", inputs: ["Slide deck draft", "Class activity"], output: "Approved teaching package", estimatedMinutes: 30, painPoints: ["Review criteria are inconsistent"], decisionsRequired: ["Academic accuracy", "Teaching quality"], repeated: true, humanReviewMandatory: true },
  ],
  majorFrustrations: ["Rebuilding similar material", "Finding prior resources", "Inconsistent final review"],
  repeatedActions: ["Searching folders", "Reformatting slides", "Writing lesson structures"],
  humanJudgmentRequired: ["Academic accuracy", "Teaching decisions", "Student-level fit"],
  sensitiveInformation: "Do not include student records or identifiable student work in external AI tools.",
  successDefinition: "Prepare the lecture in under two hours without reducing quality",
  desiredImprovement: "A repeatable preparation sequence with reusable templates and explicit review points",
};

export const studentIntake: WorkflowIntake = {
  workflowName: "Plan an academic week",
  userRole: "University student",
  objective: "Create a realistic plan for classes, assignments, study, and project work",
  trigger: "Sunday afternoon",
  frequency: "Weekly",
  currentTimeMinutes: 100,
  tools: ["LMS", "Email", "Calendar", "Notes"],
  inputs: ["Course deadlines", "Calendar commitments", "Unfinished tasks"],
  desiredOutputs: ["Prioritized task list", "Weekly schedule", "Daily starting actions"],
  currentSteps: [
    { id: "s1", order: 1, description: "Search the LMS and email for deadlines", tool: "LMS and Email", inputs: ["Course pages", "Messages"], output: "Deadline list", estimatedMinutes: 30, painPoints: ["Information is scattered and deadlines get missed"], decisionsRequired: [], repeated: true, humanReviewMandatory: false },
    { id: "s2", order: 2, description: "Rewrite assignments into a task list", tool: "Notes", inputs: ["Deadline list"], output: "Task list", estimatedMinutes: 20, painPoints: ["Large assignments stay vague"], decisionsRequired: [], repeated: true, humanReviewMandatory: false },
    { id: "s3", order: 3, description: "Estimate effort and prioritize work", tool: "Notes", inputs: ["Task list"], output: "Prioritized work", estimatedMinutes: 25, painPoints: ["Time estimates are optimistic"], decisionsRequired: ["Academic priorities", "Available energy"], repeated: true, humanReviewMandatory: true },
    { id: "s4", order: 4, description: "Build the weekly calendar", tool: "Calendar", inputs: ["Prioritized work", "Fixed commitments"], output: "Weekly schedule", estimatedMinutes: 25, painPoints: ["Plans leave no recovery time"], decisionsRequired: ["Personal capacity"], repeated: true, humanReviewMandatory: true },
  ],
  majorFrustrations: ["Scattered deadlines", "Unrealistic schedules", "Not knowing where to start"],
  repeatedActions: ["Checking each course page", "Copying deadlines", "Rescheduling unfinished work"],
  humanJudgmentRequired: ["Personal priorities", "Realistic capacity"],
  sensitiveInformation: "Do not include private health, disability, or account information in unapproved AI tools.",
  successDefinition: "Start each day knowing the next action and complete important deadlines on time",
  desiredImprovement: "One consistent weekly planning ritual with a recovery process",
};

export const workflowCards = [
  { title: "Lecture preparation", audience: "Professor", ready: true, description: "Turn scattered source material into a reviewed teaching package." },
  { title: "Weekly academic planning", audience: "Student", ready: true, description: "Collect commitments and create a realistic, recoverable week." },
  { title: "Research project organization", audience: "Both", ready: false, description: "Connect questions, evidence, decisions, and next actions." },
  { title: "Meeting preparation", audience: "Both", ready: false, description: "Prepare context, decisions, notes, and follow-ups." },
  { title: "Assignment feedback", audience: "Professor", ready: false, description: "Structure feedback while preserving instructor judgment." },
  { title: "Course material organization", audience: "Professor", ready: false, description: "Create a repeatable structure for teaching files." },
];
