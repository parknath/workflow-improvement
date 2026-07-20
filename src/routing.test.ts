import { describe, expect, it } from "vitest";
import { basePath, routeFromPathname, routeHref } from "./routing";

const routes = ["/", "/how-it-works", "/workflows", "/demo", "/intake", "/sample-result", "/inbox-automation"] as const;

describe("deployment-aware routing", () => {
  it("keeps root-hosted development routes unchanged", () => {
    expect(basePath("/")).toBe("");
    expect(routeFromPathname("/intake", "/", routes)).toBe("/intake");
    expect(routeFromPathname("/intake/", "/", routes)).toBe("/intake");
    expect(routeHref("/sample-result", "/")).toBe("/sample-result/");
  });

  it("maps GitHub Pages project paths to product routes", () => {
    expect(basePath("/workflow-improvement/")).toBe("/workflow-improvement");
    expect(routeFromPathname("/workflow-improvement/", "/workflow-improvement/", routes)).toBe("/");
    expect(routeFromPathname("/workflow-improvement/intake/", "/workflow-improvement/", routes)).toBe("/intake");
    expect(routeHref("/sample-result", "/workflow-improvement/")).toBe("/workflow-improvement/sample-result/");
    expect(routeFromPathname("/workflow-improvement/inbox-automation/", "/workflow-improvement/", routes)).toBe("/inbox-automation");
  });

  it("falls back to the product home for unknown paths", () => {
    expect(routeFromPathname("/workflow-improvement/not-a-route", "/workflow-improvement/", routes)).toBe("/");
  });
});
