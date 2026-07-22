import { afterEach, describe, expect, it } from "vitest";
import handler, { classificationInstructions, classificationSchema } from "./classify";

const originalAccessKey = process.env.AUTOMATION_ACCESS_KEY;
const originalOpenAiKey = process.env.OPENAI_API_KEY;

function responseRecorder() {
  const result = { status: 0, payload: undefined as unknown };
  return {
    result,
    response: {
      status(code: number) { result.status = code; return this; },
      json(payload: unknown) { result.payload = payload; },
    },
  };
}

afterEach(() => {
  if (originalAccessKey === undefined) delete process.env.AUTOMATION_ACCESS_KEY; else process.env.AUTOMATION_ACCESS_KEY = originalAccessKey;
  if (originalOpenAiKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalOpenAiKey;
});

describe("protected ChatGPT classifier endpoint", () => {
  it("uses a strict one-item-per-source schema and grounded instructions", () => {
    expect(classificationSchema.additionalProperties).toBe(false);
    expect(classificationSchema.properties.items.items.required).toContain("sourceId");
    expect(classificationInstructions).toContain("Never invent");
    expect(classificationInstructions).toContain("human review");
  });

  it("fails closed when the server access gate is not configured", async () => {
    delete process.env.AUTOMATION_ACCESS_KEY;
    const { result, response } = responseRecorder();
    await handler({ method: "POST", headers: {}, body: {} }, response);
    expect(result).toEqual({ status: 503, payload: { error: "The automation access gate is not configured." } });
  });

  it("rejects malformed JSON before contacting OpenAI", async () => {
    process.env.AUTOMATION_ACCESS_KEY = "test-access";
    process.env.OPENAI_API_KEY = "test-openai";
    const { result, response } = responseRecorder();
    await handler({ method: "POST", headers: { "content-type": "application/json", "x-workflow-lab-key": "test-access" }, body: "{" }, response);
    expect(result).toEqual({ status: 400, payload: { error: "Send valid JSON." } });
  });

  it("requires JSON and rejects oversized requests before contacting OpenAI", async () => {
    process.env.AUTOMATION_ACCESS_KEY = "test-access";
    process.env.OPENAI_API_KEY = "test-openai";
    const missingType = responseRecorder();
    await handler({ method: "POST", headers: { "x-workflow-lab-key": "test-access" }, body: {} }, missingType.response);
    expect(missingType.result).toEqual({ status: 415, payload: { error: "Use application/json." } });
    const oversized = responseRecorder();
    await handler({ method: "POST", headers: { "content-type": "application/json", "x-workflow-lab-key": "test-access" }, body: { messages: [{ snippet: "x".repeat(65 * 1024) }] } }, oversized.response);
    expect(oversized.result).toEqual({ status: 413, payload: { error: "The classification request is too large." } });
  });

  it("rejects duplicate message identifiers before contacting OpenAI", async () => {
    process.env.AUTOMATION_ACCESS_KEY = "test-access";
    process.env.OPENAI_API_KEY = "test-openai";
    const duplicate = { sourceId: "same", sender: "a@example.edu", subject: "Subject", receivedAt: "2026-07-20T00:00:00Z", snippet: "Snippet" };
    const { result, response } = responseRecorder();
    await handler({ method: "POST", headers: { "content-type": "application/json", "x-workflow-lab-key": "test-access" }, body: { messages: [duplicate, duplicate] } }, response);
    expect(result).toEqual({ status: 400, payload: { error: "Every message sourceId must be unique." } });
  });
});
