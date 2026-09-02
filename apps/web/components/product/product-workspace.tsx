"use client";

import { useEffect, useState } from "react";
import { apiRequest, ApiClientError } from "../../lib/api/client";
import { Button, Card, Field, Select } from "../ui/primitives";
import { useAuth } from "../../lib/auth/context";

type Provider = { id: string; provider_id: "gemini" | "openai" | "anthropic"; model_id: string; key_hint: string };
type Document = { id: string; filename: string; status: string; created_at: string; processing_error_code?: string };
type Result = { readiness_score: number; dimensions: { id: string; label: string; score: number; rationale: string }[]; career_signals: { id: string; label: string; score: number; finding: string }[]; strengths: string[]; gaps: string[]; recommendations: string[]; rewrites: string[]; lesson_suggestions: string[] };
type Job = { id: string; status: "pending" | "complete" | "failed"; error_code?: string; result?: Result };
type Detail = { document: Document; analyses: Job[] };

const MODELS = { gemini: "gemini-3.7-flash", openai: "gpt-5.4-mini", anthropic: "claude-sonnet-5" } as const;
const FIXTURE_MODELS = { gemini: "gemini-2.5-flash", openai: "gpt-5-mini", anthropic: "claude-sonnet-4-5" } as const;
const OUTCOMES = ["success", "invalid", "quota", "rate_limit", "unavailable", "timeout", "malformed", "safety"];
function message(error: unknown) { return error instanceof ApiClientError ? `${error.message} (${error.code})` : "The API is unavailable. Check the connection and try again."; }

function base64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let value = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) value += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  return btoa(value);
}

export function ProductWorkspace({ enabled, fixture = false }: { enabled: boolean; fixture?: boolean }) {
  const auth = useAuth();
  const [signedIn, setSignedIn] = useState(true);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [historyOffset, setHistoryOffset] = useState(0);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [providerId, setProviderId] = useState<keyof typeof MODELS>("openai");
  const [outcome, setOutcome] = useState("success");
  const [credential, setCredential] = useState("");
  const [cvText, setCvText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [role, setRole] = useState("AI Engineer");
  const [jobDescription, setJobDescription] = useState("");
  const [consent, setConsent] = useState(false);
  const [job, setJob] = useState<Job | null>(null);
  const [status, setStatus] = useState(fixture ? "Fixture workspace ready." : "Account workspace ready.");
  const [busy, setBusy] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function refresh(offset = historyOffset) {
    const [nextProviders, page] = await Promise.all([apiRequest<Provider[]>("/providers"), apiRequest<{ items: Document[]; total: number }>(`/cv/documents?offset=${offset}&limit=3`)]);
    setProviders(nextProviders); setDocuments(page.items); setHistoryTotal(page.total); setHistoryOffset(offset);
  }
  const hasAccount = fixture ? signedIn : Boolean(auth.user);
  useEffect(() => { if (enabled && hasAccount) refresh().catch((error) => setStatus(message(error))); }, [enabled, hasAccount]);

  async function connect() {
    if (!fixture && credential.trim().length < 20) { setStatus("Enter the provider API key without quotes or a variable name."); return; }
    setBusy(true); setStatus(`Verifying ${providerId}…`);
    try {
      const connected = await apiRequest<Provider>("/providers", { method: "POST", body: JSON.stringify({ provider_id: providerId, model_id: (fixture ? FIXTURE_MODELS : MODELS)[providerId], credential: fixture ? `fake-${outcome}` : credential.trim() }) });
      setActiveConnectionId(connected.id);
      setCredential(""); await refresh(); setStatus(fixture ? "Fixture provider connected. No credential was stored securely." : "Provider verified and credential encrypted in your account vault.");
    } catch (error) { setStatus(message(error)); } finally { setBusy(false); }
  }

  async function runAnalysis() {
    const connection = providers.find((item) => item.id === activeConnectionId) ?? providers.find((item) => item.provider_id === providerId) ?? providers[0];
    if (!connection) { setStatus(`Connect a${fixture ? " fixture" : "n AI"} provider first.`); return; }
    if (!fixture && !consent) { setStatus("Confirm provider processing consent before analysis."); return; }
    setBusy(true); setJob(null); setStatus("Validating and extracting your CV…");
    try {
      let text = cvText;
      let filename = fixture ? "pasted-fixture.txt" : "pasted-cv.txt";
      let mime = "text/plain";
      let payload: Record<string, unknown> = { pasted_text: text };
      if (file) { filename = file.name; mime = file.type || "application/octet-stream"; text = fixture ? await file.text() : "Server-extracted CV content is intentionally not returned to the browser. ".repeat(3); payload = fixture ? { content: text, extracted_text: text } : { content_base64: base64(await file.arrayBuffer()) }; }
      const document = await apiRequest<Document>("/cv/documents", { method: "POST", body: JSON.stringify({ filename, mime_type: mime, ...payload, target_role: role, job_description: jobDescription, consent: true }) });
      setStatus(fixture ? "Analysis pending in the local fake provider…" : "Analysis is running through your selected provider…");
      const analysisBody = fixture ? { connection_id: connection.id, cv_text: text, target_role: role, job_description: jobDescription } : { connection_id: connection.id };
      const nextJob = await apiRequest<Job>(`/cv/documents/${document.id}/analyses`, { method: "POST", headers: { "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify(analysisBody) });
      setJob(nextJob); setCvText(""); setFile(null); await refresh(0);
      setStatus(nextJob.status === "complete" ? (fixture ? "Mock analysis complete. This is not a real AI result." : "Analysis complete and saved to your account.") : `Analysis failed safely: ${nextJob.error_code}.`);
    } catch (error) { setStatus(message(error)); } finally { setBusy(false); }
  }

  async function openDocument(id: string) {
    try { const detail = await apiRequest<Detail>(`/cv/documents/${id}`); setJob(detail.analyses[0] ?? null); setStatus(`Opened ${detail.document.filename}.`); } catch (error) { setStatus(message(error)); }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    try { await apiRequest(`/cv/documents/${deleteId}`, { method: "DELETE" }); setDeleteId(null); setJob(null); await refresh(); setStatus("CV file and saved analyses permanently removed."); } catch (error) { setStatus(message(error)); }
  }

  if (!enabled) return <main id="main-content" className="product-page"><h1>CV Analysis workspace</h1><p>The local fixture workspace is disabled in ordinary production builds.</p></main>;
  if (!hasAccount) return <main id="main-content" className="product-page"><p className="ui-eyebrow">Private account workspace</p><h1>CV Analysis workspace</h1><p>Sign in to connect a provider and keep private CV analyses in your account.</p>{fixture && <p>No account is created. This state exists only for local browser testing.</p>}{fixture ? <Button onClick={() => setSignedIn(true)}>Enter fixture account</Button> : <Button disabled={!auth.configured} onClick={() => auth.signIn("github")}>Continue with GitHub</Button>}</main>;

  return <main id="main-content" className="product-page">
    <header className="product-hero"><div><p className="ui-eyebrow">{fixture ? "Local fixture · not production AI" : "Private account analysis"}</p><h1>CV Analysis workspace</h1><p>{fixture ? "Exercise the account, provider, document, and analysis contracts entirely in process memory." : "Analyze how clearly your CV communicates evidence for a target role. This is guidance, not an employability decision."}</p></div>{fixture ? <Button variant="secondary" onClick={() => setSignedIn(false)}>View signed-out state</Button> : <Button variant="secondary" onClick={() => auth.signOut()}>Sign out</Button>}</header>
    <p className="product-banner">{fixture ? "Fixture data survives only while the local API process runs." : "Your CV stays in private account storage. Your selected provider receives its text only after explicit consent."}</p>
    <p className="sr-only" role="status" aria-live="polite">{status}</p><p className="product-status" aria-hidden="true">{status}</p>
    <div className="product-grid">
      <Card><p className="ui-eyebrow">01 · Provider</p><h2>Connection</h2>
        <Field label="Provider"><Select value={providerId} onChange={(event) => setProviderId(event.target.value as keyof typeof MODELS)}><option value="openai">OpenAI{fixture ? " fixture" : ""}</option><option value="anthropic">Anthropic{fixture ? " fixture" : ""}</option><option value="gemini">Gemini{fixture ? " fixture" : ""}</option></Select></Field>
        {fixture ? <Field label="Fixture outcome" help="Controls the deterministic fake adapter; never enter a real key."><Select value={outcome} onChange={(event) => setOutcome(event.target.value)}>{OUTCOMES.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</Select></Field> : <Field label="Provider API key" help="Verified by FastAPI and stored through Supabase Vault; never returned to this browser."><input type="password" autoComplete="off" value={credential} onChange={(event) => setCredential(event.target.value)} /></Field>}
        <Button loading={busy} onClick={connect}>{fixture ? "Connect opaque fixture" : "Verify and connect"}</Button>
        <ul className="product-list">{providers.map((item) => <li key={item.id}><span><strong>{item.provider_id}</strong><small>{item.model_id} · {item.key_hint}</small></span><span className="product-actions"><Button variant="secondary" onClick={async () => { await apiRequest(`/providers/${item.id}/model`, { method: "PATCH", body: JSON.stringify({ model_id: item.model_id }) }); setStatus("Provider model re-verified and updated."); }}>Update model</Button><Button variant="danger" onClick={async () => { await apiRequest(`/providers/${item.id}`, { method: "DELETE" }); await refresh(); setStatus("Provider connection removed."); }}>Disconnect</Button></span></li>)}</ul>
      </Card>
      <Card><p className="ui-eyebrow">02 · CV input</p><h2>{fixture ? "Synthetic document" : "Private document"}</h2>
        <Field label="Target role"><input value={role} onChange={(event) => setRole(event.target.value)} /></Field>
        <Field label="Job description" optional help="Used only to compare the CV with the target context."><textarea rows={4} value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} /></Field>
        <Field label={`${fixture ? "Upload synthetic" : "Upload"} PDF, DOCX, TXT, or Markdown`} optional help="Selecting a file replaces pasted text. Files are extracted within bounded server limits."><input type="file" accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setCvText(""); }} /></Field>
        <Field label={`Or paste ${fixture ? "synthetic " : ""}CV text`} help={`${cvText.length} / 100,000 characters`}><textarea rows={7} value={cvText} onChange={(event) => { setCvText(event.target.value); setFile(null); }} /></Field>
        {!fixture && <label className="product-consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /> I consent to sending the extracted CV and role context to my selected AI provider for this analysis.</label>}
        <Button loading={busy} onClick={runAnalysis}>{fixture ? "Run mock analysis" : "Analyze CV"}</Button>
      </Card>
    </div>
    {job?.result && <section className="product-result" aria-labelledby="result-title"><p className="ui-eyebrow">03 · {fixture ? "Mock result" : "Analysis result"}</p><h2 id="result-title">Readiness communication score: {job.result.readiness_score}</h2><p>{fixture ? "This fixture describes" : "This analysis describes"} CV communication evidence, not employability or verified skill.</p><div className="product-metrics">{job.result.dimensions.map((item) => <Card key={item.id}><h3>{item.label}</h3><strong>{item.score}</strong><p>{item.rationale}</p></Card>)}</div><h3>Career Architect signals</h3><div className="product-signals">{job.result.career_signals.map((item) => <span key={item.id}>{item.label}: {item.score}</span>)}</div><div className="product-columns"><div><h3>Strengths</h3><ul>{job.result.strengths.map((item) => <li key={item}>{item}</li>)}</ul></div><div><h3>Gaps</h3><ul>{job.result.gaps.map((item) => <li key={item}>{item}</li>)}</ul></div><div><h3>Recommendations</h3><ul>{job.result.recommendations.map((item) => <li key={item}>{item}</li>)}</ul></div><div><h3>Suggested rewrites</h3><ul>{job.result.rewrites.map((item) => <li key={item}>{item}</li>)}</ul></div><div><h3>Lesson suggestions</h3><ul>{job.result.lesson_suggestions.map((item) => <li key={item}>{item}</li>)}</ul></div></div></section>}
    <section className="product-history" aria-labelledby="history-title"><p className="ui-eyebrow">04 · {fixture ? "Saved in process" : "Private account history"}</p><h2 id="history-title">Analysis history</h2>{documents.length ? <ul className="product-list">{documents.map((item) => <li key={item.id}><button type="button" onClick={() => openDocument(item.id)}><strong>{item.filename}</strong><small>{item.status}</small></button><Button variant="danger" onClick={() => setDeleteId(item.id)}>Delete</Button></li>)}</ul> : <p>No {fixture ? "fixture " : "saved "}analyses yet.</p>}<nav className="product-pagination" aria-label="Analysis history pages"><Button variant="secondary" disabled={historyOffset === 0} onClick={() => refresh(Math.max(0, historyOffset - 3))}>Previous history page</Button><span>{historyTotal ? `${historyOffset + 1}–${Math.min(historyOffset + 3, historyTotal)} of ${historyTotal}` : "0 analyses"}</span><Button variant="secondary" disabled={historyOffset + 3 >= historyTotal} onClick={() => refresh(historyOffset + 3)}>Next history page</Button></nav></section>
    <section className="product-account" aria-labelledby="account-title"><p className="ui-eyebrow">05 · Account settings</p><h2 id="account-title">{fixture ? "Alex Patel · fixture learner" : (auth.user?.email ?? "Signed-in learner")}</h2><p>{fixture ? "Account identity is synthetic. " : "Progress is synchronized to this account. "}Learning progress remains self-reported state and never becomes verified evidence.</p>{fixture && <Button variant="secondary" onClick={async () => { setStatus("Reconciling local fixture progress…"); try { const value = await apiRequest<{ lessons: unknown[] }>("/progress/reconcile", { method: "POST", body: JSON.stringify({ lessons: [{ lesson_path: "phases/01-math-foundations/08-optimization", answers: {}, completed: true, completion_changed_at: "2026-01-01T00:00:00Z", visited_at: "2026-01-01T00:00:00Z" }] }) }); setStatus(`Progress reconciled for ${value.lessons.length} lesson without creating evidence.`); } catch (error) { setStatus(message(error)); } }}>Reconcile fixture progress</Button>}</section>
    {deleteId && <div className="ui-backdrop"><div className="ui-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-title"><h2 id="delete-title">Delete {fixture ? "fixture " : ""}document?</h2><p>This permanently removes the file and its analysis history.</p><div className="ui-dialog__actions"><Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button><Button variant="danger" onClick={confirmDelete}>Delete permanently</Button></div></div></div>}
  </main>;
}
