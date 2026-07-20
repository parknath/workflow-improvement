import { describe, expect, it, vi } from "vitest";
import { ACTION_SHEET_HEADERS, extractSpreadsheetId, gmailCandidate, scanGmail, syncGmailActions } from "./googleAutomation";

describe("Google inbox automation", () => {
  it("extracts Sheet identifiers from URLs and leaves opaque IDs unchanged", () => {
    expect(extractSpreadsheetId("https://docs.google.com/spreadsheets/d/sheet_123/edit#gid=0")).toBe("sheet_123");
    expect(extractSpreadsheetId("sheet_123")).toBe("sheet_123");
  });

  it("scans Gmail metadata without rule-classifying the message", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ messages: [{ id: "m1", threadId: "t1" }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "m1", threadId: "t1", internalDate: "1784516400000", snippet: "Action needed", payload: { headers: [{ name: "Subject", value: "Project update" }, { name: "From", value: "colleague@example.edu" }] } }), { status: 200 }));
    const [result] = await scanGmail("token", "in:inbox", 20, fetcher as typeof fetch);
    expect(result).toMatchObject({ id: "m1", subject: "Project update", relevant: false, itemType: "ignore", reason: "Awaiting ChatGPT classification." });
    expect(String(fetcher.mock.calls[1][0])).toContain("format=metadata");
  });

  it("creates a reviewed calendar event without requiring a Sheet", async () => {
    const candidate = { ...gmailCandidate({ id: "abc123", threadId: "thread", snippet: "Meet July 24" }), relevant: true, itemType: "event" as const, taskTitle: "Faculty meeting", dueDate: "2026-07-24", addToCalendar: true };
    const fetcher = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => new Response(JSON.stringify({ id: "event" }), { status: 200 }));
    await expect(syncGmailActions("token", { spreadsheetId: "", sheetName: "", calendarId: "primary" }, [candidate], fetcher as typeof fetch)).resolves.toEqual({ sheetRowsAdded: 0, calendarEventsAdded: 1, duplicatesSkipped: 0 });
    const body = JSON.parse(String(fetcher.mock.calls[0][1]?.body));
    expect(body).toMatchObject({ summary: "Faculty meeting", visibility: "private", reminders: { useDefault: false } });
  });

  it("treats an existing deterministic Calendar event as an idempotent retry", async () => {
    const candidate = { ...gmailCandidate({ id: "abc123", threadId: "thread" }), relevant: true, itemType: "event" as const, taskTitle: "Faculty meeting", dueDate: "2026-07-24", addToCalendar: true };
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ error: { message: "Event already exists" } }), { status: 409 }));
    await expect(syncGmailActions("token", { spreadsheetId: "", sheetName: "", calendarId: "primary" }, [candidate], fetcher as typeof fetch)).resolves.toEqual({ sheetRowsAdded: 0, calendarEventsAdded: 0, duplicatesSkipped: 1 });
  });

  it("deduplicates Sheet writes by immutable Gmail message ID", async () => {
    const candidate = { ...gmailCandidate({ id: "existing-message", threadId: "thread" }), relevant: true, itemType: "task" as const, addToSheet: true };
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ sheets: [{ properties: { title: "Workflow Lab Inbox" } }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ values: [[...ACTION_SHEET_HEADERS]] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ values: [["existing-message"]] }), { status: 200 }));
    await expect(syncGmailActions("token", { spreadsheetId: "sheet", sheetName: "Workflow Lab Inbox", calendarId: "primary" }, [candidate], fetcher as typeof fetch)).resolves.toEqual({ sheetRowsAdded: 0, calendarEventsAdded: 0, duplicatesSkipped: 1 });
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
});
