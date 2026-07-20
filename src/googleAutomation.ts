export const GOOGLE_AUTOMATION_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/calendar.events",
] as const;

export const ACTION_SHEET_HEADERS = [
  "Status",
  "Task",
  "Source",
  "Source Email Sender",
  "Source Email Subject",
  "Source Message ID",
  "Due Date",
  "Item Type",
  "Priority",
  "Suggested Action",
  "Confidence",
  "Reason",
  "Source Link",
  "Calendar Event ID",
  "Synced At",
] as const;

export interface GmailActionCandidate {
  id: string;
  threadId: string;
  subject: string;
  sender: string;
  receivedAt: string;
  snippet: string;
  sourceUrl: string;
  relevant: boolean;
  itemType: "task" | "event" | "deadline" | "follow_up" | "reference" | "ignore";
  taskTitle: string;
  summary: string;
  dueDate: string;
  dueTime: string;
  priority: "high" | "medium" | "low";
  confidence: number;
  reason: string;
  suggestedAction: string;
  addToSheet: boolean;
  addToCalendar: boolean;
}

export interface SyncConfiguration {
  spreadsheetId: string;
  sheetName: string;
  calendarId: string;
}

export interface SyncResult {
  sheetRowsAdded: number;
  calendarEventsAdded: number;
  duplicatesSkipped: number;
}

type FetchLike = typeof fetch;

interface GmailListResponse { messages?: Array<{ id: string; threadId: string }> }
interface GmailMessageResponse {
  id: string;
  threadId: string;
  internalDate?: string;
  snippet?: string;
  payload?: { headers?: Array<{ name: string; value: string }> };
}

interface SheetMetadata { sheets?: Array<{ properties?: { title?: string } }> }
interface SheetValues { values?: unknown[][] }

export class GoogleAutomationError extends Error {
  constructor(message: string, public readonly status: number) { super(message); }
}

async function googleJson<T>(url: string, accessToken: string, init: RequestInit = {}, fetcher: FetchLike = fetch): Promise<T> {
  const response = await fetcher(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    let detail = "";
    try { detail = (await response.json() as { error?: { message?: string } }).error?.message ?? ""; } catch { /* Use the status fallback. */ }
    throw new GoogleAutomationError(detail || `Google API request failed with status ${response.status}.`, response.status);
  }
  return response.status === 204 ? {} as T : response.json() as Promise<T>;
}

const headerValue = (message: GmailMessageResponse, name: string) => message.payload?.headers?.find((header) => header.name.toLowerCase() === name.toLowerCase())?.value ?? "";

export function extractSpreadsheetId(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match?.[1] ?? trimmed;
}

export function gmailCandidate(message: GmailMessageResponse): GmailActionCandidate {
  const subject = headerValue(message, "Subject") || "Email requiring review";
  const sender = headerValue(message, "From") || "Unknown sender";
  return {
    id: message.id,
    threadId: message.threadId,
    subject,
    sender,
    receivedAt: message.internalDate ? new Date(Number(message.internalDate)).toISOString() : headerValue(message, "Date"),
    snippet: message.snippet ?? "",
    sourceUrl: `https://mail.google.com/mail/u/0/#all/${message.threadId}`,
    relevant: false,
    itemType: "ignore",
    taskTitle: subject.replace(/^(re|fwd?):\s*/i, "").trim(),
    summary: "",
    dueDate: "",
    dueTime: "",
    priority: "medium",
    confidence: 0,
    reason: "Awaiting ChatGPT classification.",
    suggestedAction: "Review this message before creating an action.",
    addToSheet: false,
    addToCalendar: false,
  };
}

export async function scanGmail(accessToken: string, query: string, limit = 20, fetcher: FetchLike = fetch): Promise<GmailActionCandidate[]> {
  const params = new URLSearchParams({ q: query.trim() || "in:inbox is:important newer_than:14d", maxResults: String(Math.min(Math.max(limit, 1), 50)) });
  const list = await googleJson<GmailListResponse>(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`, accessToken, {}, fetcher);
  return Promise.all((list.messages ?? []).map(async ({ id }) => {
    const metadata = new URLSearchParams({ format: "metadata" });
    ["Subject", "From", "Date"].forEach((header) => metadata.append("metadataHeaders", header));
    const message = await googleJson<GmailMessageResponse>(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(id)}?${metadata}`, accessToken, {}, fetcher);
    return gmailCandidate(message);
  }));
}

const quotedSheet = (sheetName: string) => `'${sheetName.replace(/'/g, "''")}'`;
const columnName = (index: number) => {
  let value = index;
  let output = "";
  while (value > 0) { value -= 1; output = String.fromCharCode(65 + (value % 26)) + output; value = Math.floor(value / 26); }
  return output;
};

async function prepareSheet(accessToken: string, spreadsheetId: string, sheetName: string, fetcher: FetchLike): Promise<string[]> {
  const metadata = await googleJson<SheetMetadata>(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=sheets.properties.title`, accessToken, {}, fetcher);
  const hasSheet = (metadata.sheets ?? []).some((sheet) => sheet.properties?.title === sheetName);
  if (!hasSheet) {
    await googleJson(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`, accessToken, {
      method: "POST",
      body: JSON.stringify({ requests: [{ addSheet: { properties: { title: sheetName } } }] }),
    }, fetcher);
  }
  const range = encodeURIComponent(`${quotedSheet(sheetName)}!1:1`);
  const current = await googleJson<SheetValues>(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${range}`, accessToken, {}, fetcher);
  const headers = (current.values?.[0] ?? []).map(String);
  const complete = [...headers];
  for (const header of ACTION_SHEET_HEADERS) if (!complete.includes(header)) complete.push(header);
  if (complete.length !== headers.length) {
    const updateRange = encodeURIComponent(`${quotedSheet(sheetName)}!A1:${columnName(complete.length)}1`);
    await googleJson(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${updateRange}?valueInputOption=RAW`, accessToken, {
      method: "PUT",
      body: JSON.stringify({ range: `${quotedSheet(sheetName)}!A1:${columnName(complete.length)}1`, majorDimension: "ROWS", values: [complete] }),
    }, fetcher);
  }
  return complete;
}

async function existingMessageIds(accessToken: string, spreadsheetId: string, sheetName: string, headers: string[], fetcher: FetchLike): Promise<Set<string>> {
  const index = headers.indexOf("Source Message ID");
  if (index < 0) return new Set();
  const column = columnName(index + 1);
  const range = encodeURIComponent(`${quotedSheet(sheetName)}!${column}2:${column}`);
  const response = await googleJson<SheetValues>(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${range}`, accessToken, {}, fetcher);
  return new Set((response.values ?? []).flat().map(String).filter(Boolean));
}

const nextDate = (date: string) => { const value = new Date(`${date}T00:00:00Z`); value.setUTCDate(value.getUTCDate() + 1); return value.toISOString().slice(0, 10); };
const calendarEventId = (messageId: string) => `a${messageId.toLowerCase().replace(/[^a-v0-9]/g, "")}`;

async function createCalendarEvent(accessToken: string, calendarId: string, candidate: GmailActionCandidate, fetcher: FetchLike): Promise<{ id: string; created: boolean }> {
  const id = calendarEventId(candidate.id);
  const timedStart = candidate.dueTime ? new Date(`${candidate.dueDate}T${candidate.dueTime}:00`) : null;
  const timedEnd = timedStart ? new Date(timedStart.getTime() + 60 * 60 * 1000) : null;
  try {
    await googleJson(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId || "primary")}/events`, accessToken, {
      method: "POST",
      body: JSON.stringify({
        id,
        summary: candidate.taskTitle,
        description: `${candidate.summary || "Created from a reviewed Gmail item."}\n\nSource: ${candidate.sourceUrl}`,
        start: timedStart ? { dateTime: timedStart.toISOString() } : { date: candidate.dueDate },
        end: timedEnd ? { dateTime: timedEnd.toISOString() } : { date: nextDate(candidate.dueDate) },
        visibility: "private",
        reminders: { useDefault: false, overrides: [{ method: "email", minutes: 1440 }, { method: "popup", minutes: 60 }] },
        extendedProperties: { private: { workflowLabSource: "gmail", workflowLabSourceId: candidate.id } },
      }),
    }, fetcher);
    return { id, created: true };
  } catch (error) {
    if (!(error instanceof GoogleAutomationError) || error.status !== 409) throw error;
    return { id, created: false };
  }
}

const rowFor = (candidate: GmailActionCandidate, headers: string[], eventId: string, syncedAt: string) => {
  const values: Record<string, string> = {
    Status: "Needs Review",
    Task: candidate.taskTitle,
    Source: "Gmail",
    "Source Email Sender": candidate.sender,
    "Source Email Subject": candidate.subject,
    "Source Message ID": candidate.id,
    "Due Date": candidate.dueDate,
    "Item Type": candidate.itemType,
    Priority: candidate.priority,
    "Suggested Action": candidate.suggestedAction,
    Confidence: String(candidate.confidence),
    Reason: candidate.reason,
    "Source Link": candidate.sourceUrl,
    "Calendar Event ID": eventId,
    "Synced At": syncedAt,
  };
  return headers.map((header) => values[header] ?? "");
};

export async function syncGmailActions(accessToken: string, configuration: SyncConfiguration, candidates: GmailActionCandidate[], fetcher: FetchLike = fetch): Promise<SyncResult> {
  const selected = candidates.filter((candidate) => candidate.addToSheet || candidate.addToCalendar);
  if (!selected.length) return { sheetRowsAdded: 0, calendarEventsAdded: 0, duplicatesSkipped: 0 };
  if (selected.some((candidate) => !candidate.taskTitle.trim())) throw new Error("Every selected action needs a reviewed title.");
  if (selected.some((candidate) => candidate.addToCalendar && !candidate.dueDate)) throw new Error("Every selected Calendar event needs a reviewed date.");
  const needsSheet = selected.some((candidate) => candidate.addToSheet);
  const spreadsheetId = extractSpreadsheetId(configuration.spreadsheetId);
  if (needsSheet && !spreadsheetId) throw new Error("Enter a Google Sheet URL or spreadsheet ID for the selected Sheet rows.");
  const sheetName = configuration.sheetName.trim() || "Workflow Lab Inbox";
  const headers = needsSheet ? await prepareSheet(accessToken, spreadsheetId, sheetName, fetcher) : [];
  const existing = needsSheet ? await existingMessageIds(accessToken, spreadsheetId, sheetName, headers, fetcher) : new Set<string>();
  const syncedAt = new Date().toISOString();
  let calendarEventsAdded = 0;
  let duplicatesSkipped = 0;
  const rows: string[][] = [];
  for (const candidate of selected) {
    const event = candidate.addToCalendar ? await createCalendarEvent(accessToken, configuration.calendarId, candidate, fetcher) : undefined;
    if (event?.created) calendarEventsAdded += 1;
    if (event && !event.created) duplicatesSkipped += 1;
    if (candidate.addToSheet && existing.has(candidate.id)) duplicatesSkipped += 1;
    else if (candidate.addToSheet) rows.push(rowFor(candidate, headers, event?.id ?? "", syncedAt));
  }
  if (rows.length && spreadsheetId) {
    const range = encodeURIComponent(`${quotedSheet(sheetName)}!A:${columnName(headers.length)}`);
    await googleJson(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, accessToken, {
      method: "POST",
      body: JSON.stringify({ range: `${quotedSheet(sheetName)}!A:${columnName(headers.length)}`, majorDimension: "ROWS", values: rows }),
    }, fetcher);
  }
  return { sheetRowsAdded: rows.length, calendarEventsAdded, duplicatesSkipped };
}
