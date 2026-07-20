import { createHash, timingSafeEqual } from "node:crypto";
import OpenAI from "openai";

interface ApiRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}

interface ApiResponse {
  status(code: number): ApiResponse;
  json(payload: unknown): void;
}

interface ClassificationMessage {
  sourceId: string;
  sender: string;
  subject: string;
  receivedAt: string;
  snippet: string;
}

export const classificationSchema = {
  type: "object",
  additionalProperties: false,
  required: ["items"],
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["sourceId", "relevant", "itemType", "taskTitle", "summary", "dueDate", "dueTime", "priority", "confidence", "reason", "suggestedAction", "calendarRecommended"],
        properties: {
          sourceId: { type: "string" },
          relevant: { type: "boolean" },
          itemType: { type: "string", enum: ["task", "event", "deadline", "follow_up", "reference", "ignore"] },
          taskTitle: { type: "string" },
          summary: { type: "string" },
          dueDate: { type: "string", description: "Explicit YYYY-MM-DD date or an empty string." },
          dueTime: { type: "string", description: "Explicit 24-hour HH:MM local time or an empty string." },
          priority: { type: "string", enum: ["high", "medium", "low"] },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          reason: { type: "string" },
          suggestedAction: { type: "string" },
          calendarRecommended: { type: "boolean" },
        },
      },
    },
  },
} as const;

export const classificationInstructions = `You classify email metadata into a personal action inbox. Return exactly one item for every sourceId and preserve each sourceId exactly.

Treat an email as relevant only when it contains a concrete task, request, follow-up, deadline, event, reminder-worthy commitment, or reference the user should deliberately retain. Marketing, routine notifications, receipts with no required action, and vague informational mail should normally be ignored.

Never invent a task, commitment, priority, date, or time. A due date or event time must be explicit in the supplied subject or snippet. If a date is ambiguous, relative without a reliable anchor, or missing, return an empty string and explain the ambiguity. Calendar creation should be recommended only for a real event, deadline, appointment, or time-bound commitment with an explicit date. Keep task titles concise and actionable. Summaries and reasons must be grounded only in the supplied fields. All output is a draft for human review.`;

function secureMatch(received: string, expected: string): boolean {
  const left = createHash("sha256").update(received).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right);
}

function header(request: ApiRequest, name: string): string {
  const value = request.headers[name] ?? request.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function validMessage(value: unknown): value is ClassificationMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Record<string, unknown>;
  return ["sourceId", "sender", "subject", "receivedAt", "snippet"].every((key) => typeof message[key] === "string");
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== "POST") return response.status(405).json({ error: "Use POST." });
  const expectedKey = process.env.AUTOMATION_ACCESS_KEY ?? "";
  if (!expectedKey) return response.status(503).json({ error: "The automation access gate is not configured." });
  if (!secureMatch(header(request, "x-workflow-lab-key"), expectedKey)) return response.status(401).json({ error: "The Workflow Lab access key is incorrect." });
  if (!process.env.OPENAI_API_KEY) return response.status(503).json({ error: "OpenAI classification is not configured." });
  let body: Record<string, unknown> | undefined;
  try {
    body = typeof request.body === "string" ? JSON.parse(request.body) as Record<string, unknown> : request.body as Record<string, unknown> | undefined;
  } catch {
    return response.status(400).json({ error: "Send valid JSON." });
  }
  const messages = body?.messages;
  if (!Array.isArray(messages) || messages.length < 1 || messages.length > 25 || !messages.every(validMessage)) return response.status(400).json({ error: "Send between 1 and 25 valid message previews." });
  const timezone = typeof body?.timezone === "string" ? body.timezone.slice(0, 100) : "unknown";
  const safeMessages = messages.map((message) => ({
    sourceId: message.sourceId.slice(0, 200),
    sender: message.sender.slice(0, 300),
    subject: message.subject.slice(0, 500),
    receivedAt: message.receivedAt.slice(0, 100),
    snippet: message.snippet.slice(0, 1000),
  }));
  if (new Set(safeMessages.map((message) => message.sourceId)).size !== safeMessages.length) return response.status(400).json({ error: "Every message sourceId must be unique." });
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const result = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
      store: false,
      input: [
        { role: "developer", content: `${classificationInstructions}\n\nThe user's local timezone is ${timezone}.` },
        { role: "user", content: JSON.stringify({ messages: safeMessages }) },
      ],
      text: { format: { type: "json_schema", name: "gmail_action_classification", strict: true, schema: classificationSchema } },
    });
    const parsed = JSON.parse(result.output_text) as { items?: Array<{ sourceId?: unknown }> };
    if (!Array.isArray(parsed.items) || parsed.items.length !== safeMessages.length) throw new Error("The model returned an incomplete result.");
    const expectedIds = new Set(safeMessages.map((message) => message.sourceId));
    if (parsed.items.some((item) => typeof item.sourceId !== "string" || !expectedIds.delete(item.sourceId)) || expectedIds.size) throw new Error("The model returned unknown, duplicate, or missing source identifiers.");
    return response.status(200).json({ ...parsed, model: process.env.OPENAI_MODEL || "gpt-5.6-luna" });
  } catch (error) {
    console.error("OpenAI classification failed", error instanceof Error ? error.message : "Unknown classification error");
    return response.status(502).json({ error: "OpenAI classification failed. No actions were applied." });
  }
}
