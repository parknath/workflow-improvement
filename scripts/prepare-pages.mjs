import fs from "node:fs";

const index = "dist/index.html";
const fallback = "dist/404.html";
const routes = ["how-it-works", "workflows", "demo", "intake", "sample-result", "inbox-automation"];

if (!fs.existsSync(index)) throw new Error("Build output is missing dist/index.html");
fs.copyFileSync(index, fallback);
fs.writeFileSync("dist/.nojekyll", "");

for (const route of routes) {
  const directory = `dist/${route}`;
  fs.mkdirSync(directory, { recursive: true });
  fs.copyFileSync(index, `${directory}/index.html`);
}

const html = fs.readFileSync(index, "utf8");
if (!html.includes("/workflow-improvement/assets/")) {
  throw new Error("GitHub Pages build is missing the /workflow-improvement/ asset base.");
}
if (fs.readFileSync(fallback, "utf8") !== html) {
  throw new Error("GitHub Pages route fallback does not match the application shell.");
}
for (const route of routes) {
  if (fs.readFileSync(`dist/${route}/index.html`, "utf8") !== html) {
    throw new Error(`GitHub Pages route entry for ${route} does not match the application shell.`);
  }
}

console.log(`Prepared GitHub Pages artifact with project-base assets and ${routes.length} route entries.`);
