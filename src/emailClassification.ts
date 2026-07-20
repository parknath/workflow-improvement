import type { GmailActionCandidate } from "./googleAutomation";

export type ActionItemType = "task" | "event" | "deadline" | "follow_up" | "reference" | "ignore";
export type ActionPriority = "high" | "medium" | "low";

export interface EmailActionClassification {
  sourceId: string;
  relevant: boolean;
  itemType: ActionItemType;
  taskTitle: string;
  summary: string;
  dueDate: string;
  dueTime: string;
  priority: ActionPriority;
  confidence: number;
  reason: string;
  suggestedAction: string;
  calendarRecommended: boolean;
}

export interface ClassificationResponse {
  items: EmailActionClassification[];
  model: string;
}

type FetchLike = typeof fetch;

const itemTypes = new Set<ActionItemType>(["task", "event", "deadline", "follow_up", "reference", "ignore"]);
const priorities = new Set<ActionPriority>(["high", "medium", "low"]);

function validClassification(value: unknown): value is EmailActionClassification {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.sourceId === "string"
    && typeof item.relevant === "boolean"
    && itemTypes.has(item.itemType as ActionItemType)
    && ["taskTitle", "summary", "dueDate", "dueTime", "reason", "suggestedAction"].every((key) => typeof item[key] === "string")
    && priorities.has(item.priority as ActionPriority)
    && typeof item.confidence === "number" && Number.isFinite(item.confidence)
    && typeof item.calendarRecommended === "boolean";
}

export async function classifyGmailCandidates(apiBase: string, accessKey: string, candidates: GmailActionCandidate[], fetcher: FetchLike = fetch): Promise<ClassificationResponse> {
  const response = await fetcher(`${apiBase.replace(/\/$/, "")}/api/classify`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Workflow-Lab-Key": accessKey },
    body: JSON.stringify({
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      messages: candidates.slice(0, 25).map((candidate) => ({
        sourceId: candidate.id,
        sender: candidate.sender.slice(0, 300),
        subject: candidate.subject.slice(0, 500),
        receivedAt: candidate.receivedAt,
        snippet: candidate.snippet.slice(0, 1000),
      })),
    }),
  });
  const payload = await response.json() as ClassificationResponse & { error?: string };
  if (!response.ok) throw new Error(payload.error || `ChatGPT classification failed with status ${response.status}.`);
  const expectedIds = new Set(candidates.slice(0, 25).map((candidate) => candidate.id));
  if (!Array.isArray(payload.items) || payload.items.length !== expectedIds.size || !payload.items.every(validClassification)) throw new Error("ChatGPT returned an incomplete or invalid classification. No actions were applied.");
  for (const item of payload.items) {
    if (!expectedIds.delete(item.sourceId)) throw new Error("ChatGPT returned an unknown or duplicate source item. No actions were applied.");
  }
  if (expectedIds.size) throw new Error("ChatGPT omitted a source item. No actions were applied.");
  return payload;
}

export function applyClassifications(candidates: GmailActionCandidate[], classifications: EmailActionClassification[]): GmailActionCandidate[] {
  const byId = new Map(classifications.map((item) => [item.sourceId, item]));
  return candidates.map((candidate) => {
    const item = byId.get(candidate.id);
    if (!item) return candidate;
    return {
      ...candidate,
      relevant: item.relevant,
      itemType: item.itemType,
      taskTitle: item.taskTitle || candidate.subject,
      summary: item.summary,
      dueDate: /^20\d{2}-\d{2}-\d{2}$/.test(item.dueDate) ? item.dueDate : "",
      dueTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(item.dueTime) ? item.dueTime : "",
      priority: item.priority,
      confidence: Math.max(0, Math.min(1, item.confidence)),
      reason: item.reason,
      suggestedAction: item.suggestedAction,
      addToSheet: item.relevant && item.itemType !== "ignore",
      addToCalendar: item.relevant && item.calendarRecommended && Boolean(item.dueDate),
    };
  });
}
