import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarDays, Check, ExternalLink, Inbox, LoaderCircle, LogOut, Mail, RefreshCw, ShieldCheck, Sparkles, Table2 } from "lucide-react";
import { applyClassifications, classifyGmailCandidates } from "./emailClassification";
import { GOOGLE_AUTOMATION_SCOPES, scanGmail, syncGmailActions, type GmailActionCandidate, type SyncConfiguration } from "./googleAutomation";

interface GoogleTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
  scope?: string;
}

interface GoogleTokenClient { requestAccessToken(options?: { prompt?: string }): void }

declare global {
  interface Window {
    google?: { accounts: { oauth2: {
      initTokenClient(config: { client_id: string; scope: string; callback: (response: GoogleTokenResponse) => void; error_callback?: (error: { type?: string }) => void }): GoogleTokenClient;
      hasGrantedAllScopes(response: GoogleTokenResponse, ...scopes: string[]): boolean;
      revoke(token: string, callback: () => void): void;
    } } };
  }
}

interface AutomationSettings extends SyncConfiguration {
  gmailQuery: string;
  maxMessages: number;
}

const configKey = "workflow-lab-action-inbox-config";
const defaultSettings: AutomationSettings = {
  gmailQuery: "label:workflow-lab-test newer_than:30d",
  maxMessages: 5,
  spreadsheetId: "",
  sheetName: "Workflow Lab Inbox",
  calendarId: "primary",
};

function readSettings(): AutomationSettings {
  try { return { ...defaultSettings, ...JSON.parse(localStorage.getItem(configKey) ?? "{}") }; } catch { return defaultSettings; }
}

export function InboxAutomation() {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? "";
  const [settings, setSettings] = useState<AutomationSettings>(readSettings);
  const [accessKey, setAccessKey] = useState("");
  const [gisReady, setGisReady] = useState(() => typeof window !== "undefined" && Boolean(window.google?.accounts.oauth2));
  const [accessToken, setAccessToken] = useState("");
  const [consent, setConsent] = useState(false);
  const [candidates, setCandidates] = useState<GmailActionCandidate[]>([]);
  const [showIgnored, setShowIgnored] = useState(false);
  const [busy, setBusy] = useState<"" | "connect" | "scan" | "sync">("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [model, setModel] = useState("");

  const relevant = candidates.filter((candidate) => candidate.relevant);
  const visible = showIgnored ? candidates : relevant;
  const selectedSheet = candidates.filter((candidate) => candidate.addToSheet).length;
  const selectedCalendar = candidates.filter((candidate) => candidate.addToCalendar).length;
  const googleConfigured = Boolean(googleClientId);
  useEffect(() => {
    if (!googleConfigured || window.google?.accounts.oauth2) { setGisReady(Boolean(window.google?.accounts.oauth2)); return; }
    const existing = document.querySelector<HTMLScriptElement>('script[data-workflow-lab-google-auth="true"]');
    const script = existing ?? document.createElement("script");
    const loaded = () => setGisReady(Boolean(window.google?.accounts.oauth2));
    script.addEventListener("load", loaded);
    if (!existing) {
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.dataset.workflowLabGoogleAuth = "true";
      document.head.appendChild(script);
    }
    return () => script.removeEventListener("load", loaded);
  }, [googleConfigured]);
  const sourceStatus = useMemo(() => [
    { name: "Gmail", status: googleConfigured ? gisReady ? "Ready to authorize" : "Loading Google sign-in" : "Needs OAuth client", detail: "Reads message metadata and short snippets only." },
    { name: "Slack", status: "Backend connector required", detail: "Slack OAuth requires a server-side client secret; it is not exposed in this browser build." },
  ], [gisReady, googleConfigured]);

  const updateSetting = <K extends keyof AutomationSettings>(key: K, value: AutomationSettings[K]) => {
    setSettings((current) => {
      const next = { ...current, [key]: value };
      try { localStorage.setItem(configKey, JSON.stringify(next)); } catch { /* Configuration still works for this session. */ }
      return next;
    });
  };
  const updateCandidate = (id: string, patch: Partial<GmailActionCandidate>) => setCandidates((current) => current.map((candidate) => candidate.id === id ? { ...candidate, ...patch } : candidate));

  const connectGoogle = () => {
    setError(""); setNotice("");
    if (!googleClientId) { setError("Google OAuth is not configured for this deployment. Add the web client ID before connecting accounts."); return; }
    if (!window.google?.accounts.oauth2) { setError("Google Identity Services did not load. Check the network and try again."); return; }
    setBusy("connect");
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: googleClientId,
      scope: GOOGLE_AUTOMATION_SCOPES.join(" "),
      callback: (response) => {
        setBusy("");
        if (!response.access_token) { setError(response.error_description || response.error || "Google authorization did not return an access token."); return; }
        if (!window.google?.accounts.oauth2.hasGrantedAllScopes(response, ...GOOGLE_AUTOMATION_SCOPES)) { setError("Google did not grant all Gmail, Sheets, and Calendar permissions. Reconnect and approve the required scopes."); return; }
        setAccessToken(response.access_token);
        setNotice("Google connected for this browser session. The access token is kept in memory only.");
      },
      error_callback: () => { setBusy(""); setError("Google authorization was closed or failed."); },
    });
    client.requestAccessToken({ prompt: "consent" });
  };

  const disconnectGoogle = () => {
    if (accessToken && window.google?.accounts.oauth2) window.google.accounts.oauth2.revoke(accessToken, () => undefined);
    setAccessToken(""); setAccessKey(""); setConsent(false); setCandidates([]); setModel(""); setNotice("Google access revoked and the local access key cleared."); setError("");
  };

  const scanAndClassify = async () => {
    setError(""); setNotice("");
    if (!accessToken) { setError("Connect Google before scanning Gmail."); return; }
    if (!accessKey.trim()) { setError("Enter the Workflow Lab access key so the protected ChatGPT classifier can run."); return; }
    if (!consent) { setError("Confirm that the listed email metadata may be sent to OpenAI for classification."); return; }
    try {
      setBusy("scan");
      const messages = await scanGmail(accessToken, settings.gmailQuery, settings.maxMessages);
      if (!messages.length) { setCandidates([]); setNotice("No Gmail messages matched this search."); return; }
      const classified = await classifyGmailCandidates("", accessKey, messages);
      const next = applyClassifications(messages, classified.items);
      setCandidates(next); setModel(classified.model);
      setNotice(`ChatGPT reviewed ${next.length} messages and proposed ${next.filter((item) => item.relevant).length} action items. Nothing has been written yet.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The inbox scan failed.");
    } finally { setBusy(""); }
  };

  const applySelected = async () => {
    setError(""); setNotice("");
    if (!accessToken) { setError("Reconnect Google before applying changes."); return; }
    try {
      setBusy("sync");
      const result = await syncGmailActions(accessToken, settings, candidates);
      setNotice(`Applied ${result.sheetRowsAdded} Sheet row${result.sheetRowsAdded === 1 ? "" : "s"} and ${result.calendarEventsAdded} Calendar event${result.calendarEventsAdded === 1 ? "" : "s"}; skipped ${result.duplicatesSkipped} duplicate${result.duplicatesSkipped === 1 ? "" : "s"}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The selected actions could not be applied.");
    } finally { setBusy(""); }
  };

  return <main className="automation-page">
    <section className="automation-hero">
      <span className="eyebrow">Preset automation · owner beta</span>
      <h1>Turn important email into reviewed actions.</h1>
      <p>Scan Gmail, let ChatGPT identify real tasks and dates, review every proposal, then append approved items to Google Sheets and create selected Google Calendar events with reminders.</p>
      <div className="automation-boundary"><ShieldCheck/><div><b>Real connections, deliberate writes</b><p>Google access is short-lived and held in memory. Workflow Lab reads metadata and short snippets, never sends or deletes email, and never writes to Sheets or Calendar until you approve each item.</p></div></div>
    </section>

    <section className="automation-shell">
      <div className="connector-grid">{sourceStatus.map((source) => <article key={source.name}><div className="connector-title">{source.name === "Gmail" ? <Mail/> : <Inbox/>}<h2>{source.name}</h2></div><span className={source.name === "Gmail" && googleConfigured ? "status ready" : "status"}>{source.status}</span><p>{source.detail}</p></article>)}</div>

      {!googleConfigured && <div className="automation-blocker"><AlertTriangle/><div><b>Deployment configuration required</b><p>Create a Google OAuth web client for this site, enable Gmail, Sheets, and Calendar APIs, and set <code>VITE_GOOGLE_CLIENT_ID</code>. No client secret belongs in the browser.</p></div></div>}

      <section className="automation-step">
        <div className="automation-step-title"><span>01</span><div><h2>Connect Google</h2><p>Approve Gmail read-only, Sheets write, and Calendar event scopes.</p></div></div>
        <div className="automation-actions">{accessToken ? <><span className="connection-ok"><Check/> Connected for this session</span><button className="button secondary" onClick={disconnectGoogle}><LogOut/> Disconnect and revoke</button></> : <button className="button primary" disabled={busy === "connect" || !googleConfigured || !gisReady} onClick={connectGoogle}>{busy === "connect" ? <LoaderCircle className="spin"/> : <ShieldCheck/>} Connect Google</button>}</div>
      </section>

      <section className="automation-step">
        <div className="automation-step-title"><span>02</span><div><h2>Choose the inbox and destinations</h2><p>Use a Gmail search query, an existing spreadsheet, and the calendar that should receive approved events.</p></div></div>
        <div className="automation-form-grid">
          <label className="field"><span>Gmail search</span><input value={settings.gmailQuery} onChange={(event) => updateSetting("gmailQuery", event.target.value)} placeholder="label:workflow-lab-test newer_than:30d"/><small>For the first test, create the Gmail label “workflow-lab-test” and apply it only to non-sensitive messages. Every match is sent for classification.</small></label>
          <label className="field"><span>Maximum messages</span><input type="number" min="1" max="50" value={settings.maxMessages} onChange={(event) => updateSetting("maxMessages", Math.min(50, Math.max(1, Number(event.target.value))))}/></label>
          <label className="field"><span>Google Sheet URL or ID</span><input value={settings.spreadsheetId} onChange={(event) => updateSetting("spreadsheetId", event.target.value)} placeholder="https://docs.google.com/spreadsheets/d/…"/></label>
          <label className="field"><span>Sheet tab</span><input value={settings.sheetName} onChange={(event) => updateSetting("sheetName", event.target.value)} placeholder="Workflow Lab Inbox"/></label>
          <label className="field"><span>Calendar ID</span><input value={settings.calendarId} onChange={(event) => updateSetting("calendarId", event.target.value)} placeholder="primary"/><small>Use “primary” for your main Google Calendar.</small></label>
          <label className="field"><span>Workflow Lab access key</span><input type="password" autoComplete="off" value={accessKey} onChange={(event) => setAccessKey(event.target.value)} placeholder="Server-side access gate"/><small>Kept only in page memory and cleared on disconnect or refresh; this protects OpenAI usage.</small></label>
        </div>
        <label className="consent-check"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)}/><span>I approve sending each matched email’s sender, subject, timestamp, and short snippet to OpenAI for classification. No full body or attachment is sent.</span></label>
        <button className="button primary" disabled={!accessToken || busy === "scan"} onClick={scanAndClassify}>{busy === "scan" ? <LoaderCircle className="spin"/> : <Sparkles/>} Scan and classify with ChatGPT</button>
      </section>

      {(notice || error) && <div className={error ? "automation-message error" : "automation-message"} role={error ? "alert" : "status"}>{error ? <AlertTriangle/> : <Check/>}<span>{error || notice}</span></div>}

      {candidates.length > 0 && <section className="automation-step review-actions-step">
        <div className="automation-step-title"><span>03</span><div><h2>Review every proposed action</h2><p>{model ? `${model} classified ` : "ChatGPT classified "}{candidates.length} messages. Edit titles and dates before any write.</p></div></div>
        <div className="review-toolbar"><span><b>{relevant.length}</b> proposed · <b>{candidates.length - relevant.length}</b> ignored</span><button className="button text" onClick={() => setShowIgnored(!showIgnored)}>{showIgnored ? "Hide ignored" : "Review ignored"}</button></div>
        <div className="action-candidates">{visible.map((candidate) => <article key={candidate.id} className={!candidate.relevant ? "ignored" : ""}>
          <header><div><span className="status ready">{candidate.itemType.replace("_", " ")} · {candidate.priority}</span><h3>{candidate.subject}</h3><p>{candidate.sender} · {candidate.receivedAt ? new Date(candidate.receivedAt).toLocaleString() : "Unknown time"}</p></div><a href={candidate.sourceUrl} target="_blank" rel="noreferrer" aria-label="Open source email"><ExternalLink/></a></header>
          <p className="classification-reason"><b>Why ChatGPT classified it this way</b>{candidate.reason}</p>
          <label className="field"><span>Action title</span><input value={candidate.taskTitle} onChange={(event) => updateCandidate(candidate.id, { taskTitle: event.target.value })}/></label>
          <div className="two-fields"><label className="field"><span>Reviewed date</span><input type="date" value={candidate.dueDate} onChange={(event) => updateCandidate(candidate.id, { dueDate: event.target.value, addToCalendar: candidate.addToCalendar && Boolean(event.target.value) })}/></label><label className="field"><span>Reviewed time (optional)</span><input type="time" value={candidate.dueTime} onChange={(event) => updateCandidate(candidate.id, { dueTime: event.target.value })}/></label></div>
          <div className="candidate-actions"><label><input type="checkbox" checked={candidate.addToSheet} onChange={(event) => updateCandidate(candidate.id, { addToSheet: event.target.checked })}/><Table2/> Add to Sheet</label><label><input type="checkbox" checked={candidate.addToCalendar} onChange={(event) => updateCandidate(candidate.id, { addToCalendar: event.target.checked })}/><CalendarDays/> Add Calendar event and reminders</label></div>
          <details><summary>Source snippet and suggested action</summary><p>{candidate.snippet}</p><p><b>Suggested:</b> {candidate.suggestedAction}</p><p><b>Confidence:</b> {Math.round(candidate.confidence * 100)}%</p></details>
        </article>)}</div>
        <div className="apply-bar"><div><b>{selectedSheet} Sheet rows · {selectedCalendar} Calendar events</b><p>Duplicates are skipped by immutable Gmail message ID. Calendar writes require a reviewed date.</p></div><button className="button primary" disabled={busy === "sync" || (!selectedSheet && !selectedCalendar) || (selectedSheet > 0 && !settings.spreadsheetId.trim())} onClick={applySelected}>{busy === "sync" ? <LoaderCircle className="spin"/> : <RefreshCw/>} Apply selected actions</button></div>
      </section>}
    </section>
  </main>;
}
