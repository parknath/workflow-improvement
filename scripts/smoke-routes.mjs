import { preview } from "vite";

const routes = ["/", "/how-it-works", "/workflows", "/demo", "/intake", "/sample-result"];
const server = await preview({
  preview: { host: "127.0.0.1", port: 4173, strictPort: true },
});

let failed = false;
let shell = "";
try {
  for (const route of routes) {
    const response = await fetch(`http://127.0.0.1:4173${route}`);
    console.log(`${route}: ${response.status}`);
    if (response.status !== 200) failed = true;
    if (route === "/") shell = await response.text();
  }
  const scriptPath = shell.match(/<script[^>]+src="([^"]+)"/)?.[1];
  if (!scriptPath) throw new Error("Production shell did not expose its application bundle.");
  const bundle = await (await fetch(`http://127.0.0.1:4173${scriptPath}`)).text();
  const requiredContracts = [
    "Start workflow",
    "Immediate next action",
    "Complete step",
    "Report a problem",
    "First-run measurement",
    "Comparable-run measurement",
    "Your second result can now be compared",
    "Observed differences between two runs",
    "priorComparableRun",
    "Approve for next run",
    "Download previous v",
    "workflow-lab-active-workflow",
    "does not operate external tools",
  ];
  for (const contract of requiredContracts) {
    if (!bundle.includes(contract)) {
      console.error(`Production bundle is missing guided-run contract: ${contract}`);
      failed = true;
    }
  }
} finally {
  await new Promise((resolve, reject) => server.httpServer.close((error) => error ? reject(error) : resolve()));
}

if (failed) process.exit(1);
