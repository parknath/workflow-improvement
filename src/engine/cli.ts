import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { lectureIntake, studentIntake } from "../data/fixtures";
import { generatePackage } from "./generator";
import { renderMarkdownFiles } from "./markdown";

const fixture = process.argv.includes("--student") ? studentIntake : lectureIntake;
const slug = fixture.workflowName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const out = resolve(process.cwd(), "generated", slug);
const pkg = generatePackage(fixture);
await mkdir(out, { recursive: true });
await writeFile(resolve(out, "workflow-package.json"), JSON.stringify(pkg, null, 2));
for (const [name, content] of Object.entries(renderMarkdownFiles(pkg))) {
  await writeFile(resolve(out, name), content);
}
console.log(`Generated ${Object.keys(renderMarkdownFiles(pkg)).length + 1} files in ${out}`);
