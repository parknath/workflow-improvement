import { describe, expect, it, vi } from "vitest";
import { applyClassifications, classifyGmailCandidates, type EmailActionClassification } from "./emailClassification";
import { gmailCandidate } from "./googleAutomation";

const candidate = gmailCandidate({
  id: "message-1",
  threadId: "thread-1",
  internalDate: "1784516400000",
  snippet: "Please submit the revised agenda by July 24, 2026.",
  payload: { headers: [{ name: "Subject", value: "Revised agenda" }, { name: "From", value: "Dean <dean@example.edu>" }] },
});

const classification: EmailActionClassification = {
  sourceId: "message-1",
  relevant: true,
  itemType: "deadline",
  taskTitle: "Submit revised agenda",
  summary: "The dean requested the revised agenda.",
  dueDate: "2026-07-24",
  dueTime: "",
  priority: "high",
  confidence: 0.96,
  reason: "The snippet contains a concrete request and explicit date.",
  suggestedAction: "Revise and submit the agenda.",
  calendarRecommended: true,
};

describe("ChatGPT email classification boundary", () => {
  it("sends only bounded email previews and accepts one classification per source", async () => {
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body.messages[0]).toEqual({
        sourceId: "message-1",
        sender: "Dean <dean@example.edu>",
        subject: "Revised agenda",
        receivedAt: candidate.receivedAt,
        snippet: "Please submit the revised agenda by July 24, 2026.",
      });
      return new Response(JSON.stringify({ items: [classification], model: "gpt-test" }), { status: 200 });
    });
    await expect(classifyGmailCandidates("https://example.test/", "secret", [candidate], fetcher as typeof fetch)).resolves.toEqual({ items: [classification], model: "gpt-test" });
    expect(fetcher).toHaveBeenCalledWith("https://example.test/api/classify", expect.objectContaining({ method: "POST" }));
  });

  it("rejects duplicate or unknown source identifiers before proposing writes", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ items: [{ ...classification, sourceId: "unknown" }], model: "gpt-test" }), { status: 200 }));
    await expect(classifyGmailCandidates("", "secret", [candidate], fetcher as typeof fetch)).rejects.toThrow("unknown or duplicate");
  });

  it("rejects malformed model fields before proposing writes", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ items: [{ ...classification, confidence: "high" }], model: "gpt-test" }), { status: 200 }));
    await expect(classifyGmailCandidates("", "secret", [candidate], fetcher as typeof fetch)).rejects.toThrow("invalid classification");
  });

  it("maps grounded model output into editable, preselected actions", () => {
    const [result] = applyClassifications([candidate], [classification]);
    expect(result).toMatchObject({ taskTitle: "Submit revised agenda", dueDate: "2026-07-24", addToSheet: true, addToCalendar: true });
  });
});
