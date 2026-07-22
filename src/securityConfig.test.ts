import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

interface HeaderRule { source: string; headers: Array<{ key: string; value: string }> }

const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8")) as { headers?: HeaderRule[] };
const headersFor = (source: string) => Object.fromEntries((config.headers?.find((rule) => rule.source === source)?.headers ?? []).map(({ key, value }) => [key.toLowerCase(), value]));

describe("production security headers", () => {
  it("locks down executable content while preserving the Google OAuth popup", () => {
    const headers = headersFor("/(.*)");
    expect(headers["content-security-policy"]).toContain("default-src 'self'");
    expect(headers["content-security-policy"]).toContain("script-src 'self' https://accounts.google.com");
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["cross-origin-opener-policy"]).toBe("same-origin-allow-popups");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
  });

  it("prevents classifier responses from being cached", () => {
    const headers = headersFor("/api/(.*)");
    expect(headers["cache-control"]).toContain("no-store");
    expect(headers.pragma).toBe("no-cache");
  });
});
