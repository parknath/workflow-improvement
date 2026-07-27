import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InboxAutomation, readSettings } from "./InboxAutomation";

describe("Inbox automation setup", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
    });
  });

  it("shows only essential fields before the user chooses customization", () => {
    const html = renderToStaticMarkup(<InboxAutomation/>);

    expect(html).toContain("Choose how many emails to scan");
    expect(html).toContain("No labels or destination setup");
    expect(html).toContain("Emails to scan");
    expect(html).toContain("Owner access key");
    expect(html).toContain("Customize scan and destinations");
    expect(html).not.toContain("Which emails");
    expect(html).not.toContain("Existing Sheet (optional)");
    expect(html).not.toContain("Sheet tab name");
  });

  it("migrates the former label-only default without overwriting a custom search", () => {
    vi.mocked(localStorage.getItem).mockReturnValueOnce(JSON.stringify({ gmailQuery: "label:workflow-lab-test newer_than:30d", maxMessages: 12 }));
    expect(readSettings()).toMatchObject({ gmailQuery: "in:inbox newer_than:30d", maxMessages: 12 });

    vi.mocked(localStorage.getItem).mockReturnValueOnce(JSON.stringify({ gmailQuery: "from:department-chair@example.edu" }));
    expect(readSettings().gmailQuery).toBe("from:department-chair@example.edu");
  });
});
