import fs from "node:fs";

const packages = [
  "generated/prepare-a-weekly-lecture/workflow-package.json",
  "generated/plan-an-academic-week/workflow-package.json",
];

let failed = false;
for (const filename of packages) {
  const pkg = JSON.parse(fs.readFileSync(filename, "utf8"));
  const missing = pkg.improvedWorkflow.filter((step) =>
    [step.input, step.action, step.output, step.humanReview, step.failureCondition].some((value) => !String(value ?? "").trim()),
  );
  const markdownDirectory = filename.replace("/workflow-package.json", "");
  const markdownCount = fs.readdirSync(markdownDirectory).filter((name) => name.endsWith(".md")).length;

  console.log(`${filename}: ${pkg.improvedWorkflow.length} steps, ${pkg.assets.length} assets, ${markdownCount} Markdown files, ${missing.length} incomplete steps`);
  if (missing.length > 0 || markdownCount !== 9) failed = true;
}

if (failed) process.exit(1);
