"use client";

import { useEffect, useState } from "react";
import { apiRequest, ApiClientError } from "../../lib/api/client";
import { Button, Card, Field, Select } from "../ui/primitives";

type Provider = { id: string; provider_id: "gemini" | "openai" | "anthropic"; model_id: string; key_hint: string };
type Document = { id: string; filename: string; status: string; created_at: string; processing_error_code?: string };
type Result = { readiness_score: number; dimensions: { id: string; label: string; score: number; rationale: string }[]; career_signals: { id: string; label: string; score: number; finding: string }[]; strengths: string[]; gaps: string[]; recommendations: string[]; rewrites: string[]; lesson_suggestions: string[] };
type Job = { id: string; status: "pending" | "complete" | "failed"; error_code?: string; result?: Result };
type Detail = { document: Document; analyses: Job[] };

const MODELS = { gemini: "gemini-2.5-flash", openai: "gpt-5-mini", anthropic: "claude-sonnet-4-5" } as const;
const OUTCOMES = ["success", "invalid", "quota", "rate_limit", "unavailable", "timeout", "malformed", "safety"];
function message(error: unknown) { return error instanceof ApiClientError ? `${error.message} (${error.code})` : "The local fixture API is unavailable."; }

export function ProductWorkspace({ enabled }: { enabled: boolean }) {
  const [signedIn, setSignedIn] = useState(true);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [historyOffset, setHistoryOffset] = useState(0);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [providerId, setProviderId] = useState<keyof typeof MODELS>("openai");
  const [outcome, setOutcome] = useState("success");
  const [cvText, setCvText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [role, setRole] = useState("AI Engineer");
  const [job, setJob] = useState<Job | null>(null);
  const [status, setStatus] = useState("Fixture workspace ready.");
  const [busy, setBusy] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function refresh(offset = historyOffset) {
    const [nextProviders, page] = await Promise.all([apiRequest<Provider[]>("/providers"), apiRequest<{ items: Document[]; total: number }>(`/cv/documents?offset=${offset}&limit=3`)]);
    setProviders(nextProviders); setDocuments(page.items); setHistoryTotal(page.total); setHistoryOffset(offset);
  }
  useEffect(() => { if (enabled) refresh().catch((error) => setStatus(message(error))); }, [enabled]);

  async function connect() {
    setBusy(true); setStatus("Connecting fixture provider…");
    try {
      const connected = await apiRequest<Provider>("/providers", { method: "POST", body: JSON.stringify({ provider_id: providerId, model_id: MODELS[providerId], credential: `fake-${outcome}` }) });
      setActiveConnectionId(connected.id);
      await refresh(); setStatus("Fixture provider connected. No credential was stored securely.");
    } catch (error) { setStatus(message(error)); } finally { setBusy(false); }
  }

  async function runAnalysis() {
    const connection = providers.find((item) => item.id === activeConnectionId) ?? providers.find((item) => item.provider_id === providerId) ?? providers[0];
    if (!connection) { setStatus("Connect a fixture provider first."); return; }
    setBusy(true); setJob(null); setStatus("Validating and extracting the synthetic CV…");
    try {
      let text = cvText;
      let filename = "pasted-fixture.txt";
      let mime = "text/plain";
      let payload: Record<string, unknown> = { pasted_text: text };
      if (file) { text = await file.text(); filename = file.name; mime = file.type || "text/plain"; payload = { content: text, extracted_text: text }; }
      const document = await apiRequest<Document>("/cv/documents", { method: "POST", body: JSON.stringify({ filename, mime_type: mime, ...payload, target_role: role, job_description: "", consent: true }) });
      setStatus("Analysis pending in the local fake provider…");
      const nextJob = await apiRequest<Job>(`/cv/documents/${document.id}/analyses`, { method: "POST", body: JSON.stringify({ connection_id: connection.id, cv_text: text, target_role: role, job_description: "" }) });
      setJob(nextJob); setCvText(""); setFile(null); await refresh(0);
      setStatus(nextJob.status === "complete" ? "Mock analysis complete. This is not a real AI result." : `Mock analysis failed safely: ${nextJob.error_code}.`);
    } catch (error) { setStatus(message(error)); } finally { setBusy(false); }
  }

  async function openDocument(id: string) {
    try { const detail = await apiRequest<Detail>(`/cv/documents/${id}`); setJob(detail.analyses[0] ?? null); setStatus(`Opened ${detail.document.filename} from process memory.`); } catch (error) { setStatus(message(error)); }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    try { await apiRequest(`/cv/documents/${deleteId}`, { method: "DELETE" }); setDeleteId(null); setJob(null); await refresh(); setStatus("Fixture document permanently removed from process memory."); } catch (error) { setStatus(message(error)); }
  }

  if (!enabled) return <main id="main-content" className="product-page"><h1>CV Analysis workspace</h1><p>The local fixture workspace is disabled in ordinary production builds.</p></main>;
  if (!signedIn) return <main id="main-content" className="product-page"><p className="ui-eyebrow">Local fixture · signed out</p><h1>CV Analysis workspace</h1><p>Sign in to the synthetic learner state. No account is created.</p><Button onClick={() => setSignedIn(true)}>Enter fixture account</Button></main>;

  return <main id="main-content" className="product-page">
    <header className="product-hero"><div><p className="ui-eyebrow">Local fixture · not production AI</p><h1>CV Analysis workspace</h1><p>Exercise the account, provider, document, and analysis contracts entirely in process memory.</p></div><Button variant="secondary" onClick={() => setSignedIn(false)}>View signed-out state</Button></header>
    <p className="product-banner">Fixture data can survive a browser refresh while the local API process runs. Restarting that process resets everything.</p>
    <p className="sr-only" role="status" aria-live="polite">{status}</p><p className="product-status" aria-hidden="true">{status}</p>
    <div className="product-grid">
      <Card><p className="ui-eyebrow">01 · Provider</p><h2>Connection</h2>
        <Field label="Provider"><Select value={providerId} onChange={(event) => setProviderId(event.target.value as keyof typeof MODELS)}><option value="openai">OpenAI fixture</option><option value="anthropic">Anthropic fixture</option><option value="gemini">Gemini fixture</option></Select></Field>
        <Field label="Fixture outcome" help="Controls the deterministic fake adapter; never enter a real key."><Select value={outcome} onChange={(event) => setOutcome(event.target.value)}>{OUTCOMES.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</Select></Field>
        <Button loading={busy} onClick={connect}>Connect opaque fixture</Button>
        <ul className="product-list">{providers.map((item) => <li key={item.id}><span><strong>{item.provider_id}</strong><small>{item.model_id} · opaque fixture connected</small></span><span className="product-actions"><Button variant="secondary" onClick={async () => { await apiRequest(`/providers/${item.id}/model`, { method: "PATCH", body: JSON.stringify({ model_id: item.model_id }) }); setStatus("Fixture model re-verified and updated."); }}>Update model</Button><Button variant="danger" onClick={async () => { await apiRequest(`/providers/${item.id}`, { method: "DELETE" }); await refresh(); setStatus("Fixture connection disconnected."); }}>Disconnect</Button></span></li>)}</ul>
      </Card>
      <Card><p className="ui-eyebrow">02 · CV input</p><h2>Synthetic document</h2>
        <Field label="Target role"><input value={role} onChange={(event) => setRole(event.target.value)} /></Field>
        <Field label="Upload synthetic PDF, DOCX, TXT, or Markdown" optional help="Selecting a file replaces pasted text. Binary extraction remains a local fake-adapter boundary."><input type="file" accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></Field>
        <Field label="Or paste synthetic CV text" help={`${cvText.length} / 100,000 characters`}><textarea rows={7} value={cvText} onChange={(event) => { setCvText(event.target.value); setFile(null); }} /></Field>
        <Button loading={busy} onClick={runAnalysis}>Run mock analysis</Button>
      </Card>
    </div>
    {job?.result && <section className="product-result" aria-labelledby="result-title"><p className="ui-eyebrow">03 · Mock result</p><h2 id="result-title">Readiness communication score: {job.result.readiness_score}</h2><p>This fixture describes CV communication evidence, not employability or verified skill.</p><div className="product-metrics">{job.result.dimensions.map((item) => <Card key={item.id}><h3>{item.label}</h3><strong>{item.score}</strong><p>{item.rationale}</p></Card>)}</div><h3>Career Architect signals</h3><div className="product-signals">{job.result.career_signals.map((item) => <span key={item.id}>{item.label}: {item.score}</span>)}</div><div className="product-columns"><div><h3>Strengths</h3><ul>{job.result.strengths.map((item) => <li key={item}>{item}</li>)}</ul></div><div><h3>Gaps</h3><ul>{job.result.gaps.map((item) => <li key={item}>{item}</li>)}</ul></div><div><h3>Recommendations</h3><ul>{job.result.recommendations.map((item) => <li key={item}>{item}</li>)}</ul></div><div><h3>Suggested rewrites</h3><ul>{job.result.rewrites.map((item) => <li key={item}>{item}</li>)}</ul></div><div><h3>Lesson suggestions</h3><ul>{job.result.lesson_suggestions.map((item) => <li key={item}>{item}</li>)}</ul></div></div></section>}
    <section className="product-history" aria-labelledby="history-title"><p className="ui-eyebrow">04 · Saved in process</p><h2 id="history-title">Analysis history</h2>{documents.length ? <ul className="product-list">{documents.map((item) => <li key={item.id}><button type="button" onClick={() => openDocument(item.id)}><strong>{item.filename}</strong><small>{item.status}</small></button><Button variant="danger" onClick={() => setDeleteId(item.id)}>Delete</Button></li>)}</ul> : <p>No fixture analyses yet.</p>}<nav className="product-pagination" aria-label="Analysis history pages"><Button variant="secondary" disabled={historyOffset === 0} onClick={() => refresh(Math.max(0, historyOffset - 3))}>Previous history page</Button><span>{historyTotal ? `${historyOffset + 1}–${Math.min(historyOffset + 3, historyTotal)} of ${historyTotal}` : "0 analyses"}</span><Button variant="secondary" disabled={historyOffset + 3 >= historyTotal} onClick={() => refresh(historyOffset + 3)}>Next history page</Button></nav></section>
    <section className="product-account" aria-labelledby="account-title"><p className="ui-eyebrow">05 · Account settings</p><h2 id="account-title">Alex Patel · fixture learner</h2><p>Account identity is synthetic. Progress reconciliation remains learning state and never becomes verified evidence.</p><Button variant="secondary" onClick={async () => { setStatus("Reconciling local fixture progress…"); try { const value = await apiRequest<{ lessons: unknown[] }>("/progress/reconcile", { method: "POST", body: JSON.stringify({ lessons: [{ lesson_path: "phases/01-math-foundations/08-optimization", answers: {}, completed: true, completion_changed_at: "2026-01-01T00:00:00Z", visited_at: "2026-01-01T00:00:00Z" }] }) }); setStatus(`Progress reconciled for ${value.lessons.length} lesson without creating evidence.`); } catch (error) { setStatus(message(error)); } }}>Reconcile fixture progress</Button></section>
    {deleteId && <div className="ui-backdrop"><div className="ui-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-title"><h2 id="delete-title">Delete fixture document?</h2><p>This removes its in-memory analysis history.</p><div className="ui-dialog__actions"><Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button><Button variant="danger" onClick={confirmDelete}>Delete permanently</Button></div></div></div>}
  </main>;
}
