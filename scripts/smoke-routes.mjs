import { preview } from "vite";

const routes = ["/", "/how-it-works", "/workflows", "/demo", "/intake", "/sample-result"];
const server = await preview({
  preview: { host: "127.0.0.1", port: 4173, strictPort: true },
});

let failed = false;
try {
  for (const route of routes) {
    const response = await fetch(`http://127.0.0.1:4173${route}`);
    console.log(`${route}: ${response.status}`);
    if (response.status !== 200) failed = true;
  }
} finally {
  await new Promise((resolve, reject) => server.httpServer.close((error) => error ? reject(error) : resolve()));
}

if (failed) process.exit(1);
