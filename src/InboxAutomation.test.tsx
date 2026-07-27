import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InboxAutomation } from "./InboxAutomation";

describe("Inbox automation setup", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
    });
  });

  it("shows only essential fields before the user chooses customization", () => {
    const html = renderToStaticMarkup(<InboxAutomation/>);

    expect(html).toContain("Paste your Google Sheet link");
    expect(html).toContain("Owner access key");
    expect(html).toContain("Customize scan and destinations");
    expect(html).not.toContain("Emails to scan");
    expect(html).not.toContain("Maximum emails");
    expect(html).not.toContain("Sheet tab name");
  });
});
