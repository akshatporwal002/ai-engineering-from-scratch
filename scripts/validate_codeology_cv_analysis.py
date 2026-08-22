#!/usr/bin/env python3
"""Validate the account-backed Codeology CV Analysis trust boundary."""

from __future__ import annotations

import json
import sys
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
PAGE = ROOT / "site" / "cv-analysis.html"
UI = ROOT / "site" / "cv-analysis.js"
API_ERRORS = ROOT / "site" / "cv-api-errors.js"
EXPORT = ROOT / "site" / "cv-export.js"
CSS = ROOT / "site" / "codeology.css"
UI_CONTROLS = ROOT / "site" / "ui-controls.js"
CONFIG = ROOT / "site" / "codeology-config.json"
DOC = ROOT / "docs" / "CODEOLOGY_CV_ANALYSIS_MIGRATION.md"
EDGE = ROOT / "supabase" / "functions" / "cv-api" / "index.ts"
DOCX = ROOT / "supabase" / "functions" / "_shared" / "docx.js"
CONTRACT = ROOT / "supabase" / "functions" / "_shared" / "analysis-contract.js"
MIGRATION = ROOT / "supabase" / "migrations" / "20260822043422_create_account_backed_cv_analysis.sql"
PROVIDER_MIGRATION = ROOT / "supabase" / "migrations" / "20260822070000_enable_multiple_ai_providers.sql"


class CVParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.ids: Counter[str] = Counter()
        self.scripts: list[str] = []
        self.controls: dict[str, dict[str, str | None]] = {}
        self.text: list[str] = []
        self.title: list[str] = []
        self.h1: list[str] = []
        self.main_count = 0
        self.form_count = 0
        self.canonical = ""
        self._title = False
        self._h1 = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if values.get("id"):
            self.ids[values["id"] or ""] += 1
            if tag in {"input", "textarea", "select", "form", "button"}:
                self.controls[values["id"] or ""] = values
        if tag == "title": self._title = True
        elif tag == "h1": self._h1 = True
        elif tag == "main": self.main_count += 1
        elif tag == "form": self.form_count += 1
        elif tag == "script" and values.get("src"): self.scripts.append((values["src"] or "").split("?")[0])
        elif tag == "link" and values.get("rel") == "canonical": self.canonical = values.get("href") or ""

    def handle_endtag(self, tag: str) -> None:
        if tag == "title": self._title = False
        elif tag == "h1": self._h1 = False

    def handle_data(self, data: str) -> None:
        self.text.append(data)
        if self._title: self.title.append(data)
        if self._h1: self.h1.append(data)


def normalized(values: list[str]) -> str:
    return " ".join("".join(values).split())


def audit(page: str, ui: str, api_errors: str, export: str, css: str, ui_controls: str, config: dict[str, Any], documentation: str,
          edge: str, docx: str, contract: str, migration: str) -> list[str]:
    parser = CVParser()
    parser.feed(page)
    errors: list[str] = []
    if normalized(parser.title) != "CV Analysis · Codeology": errors.append("page title must identify Codeology CV Analysis")
    if normalized(parser.h1) != "Turn your CV into a learning map.": errors.append("product proposition heading changed unexpectedly")
    if parser.canonical != "cv-analysis.html": errors.append("canonical must be the relative CV route")
    if parser.main_count != 1 or parser.form_count != 2: errors.append("one main landmark and two forms are required")
    for element_id, count in parser.ids.items():
        if count > 1: errors.append(f"duplicate id {element_id!r}")
    required = {"cvAuthGate", "cvAccountWorkspace", "cvProviderForm", "cvProviderType", "cvProviderModel", "cvProviderKey", "cvAnalysisForm", "cvAnalysisProvider", "targetRole", "jobDescription", "cvText", "cvFile", "cvProviderConsent", "cvHistoryList", "cvResults", "cvReadinessScore", "cvDimensions", "cvCareerSignals", "cvSuggestions", "cvPreview", "cvExportPdf", "cvExportDocx"}
    for element_id in sorted(required - parser.ids.keys()): errors.append(f"missing required id {element_id!r}")
    accepted = (parser.controls.get("cvFile", {}).get("accept") or "").lower()
    for marker in (".pdf", ".docx", ".txt", ".md"):
        if marker not in accepted: errors.append(f"CV input must accept {marker}")
    if parser.controls.get("cvProviderConsent", {}).get("type") != "checkbox" or "required" not in parser.controls.get("cvProviderConsent", {}): errors.append("provider consent must be a required checkbox")
    for script in ("data.js", "cv-analysis-engine.js", "cv-export.js", "cv-api-errors.js", "cv-analysis.js", "ui-controls.js", "header.js"):
        if script not in parser.scripts: errors.append(f"missing script {script!r}")
    page_text = normalized(parser.text).lower()
    for phrase in ("private to your account", "encrypted server-side", "pdf · docx · txt · md", "delete a cv at any time", "formative guidance, not a hiring prediction", "does not establish identity, authorship, competence, employability"):
        if phrase not in page_text: errors.append(f"missing privacy or claim boundary {phrase!r}")
    browser_runtime = (ui + "\n" + api_errors).lower()
    for marker in ("localstorage.setitem('cv", "sessionstorage.setitem('cv", "service_role", "supabase_service_role"):
        if marker in browser_runtime: errors.append(f"browser CV runtime contains forbidden marker {marker!r}")
    for marker in ("client.storage.from('cv-documents').upload", "client.from('cv_documents').insert", "client.functions.invoke('cv-api'", "codeologyauth", "textcontent", "confirm("):
        if marker not in ui.lower(): errors.append(f"browser runtime missing account contract {marker!r}")
    if "innerHTML" in ui: errors.append("analysis results must use safe DOM construction")
    for marker in ("error.context", "clone().json()", "functionsfetcherror", "provider_storage_unavailable"):
        if marker not in api_errors.lower(): errors.append(f"provider error decoder missing {marker!r}")
    for marker in ("application/vnd.openxmlformats-officedocument.wordprocessingml.document", "exportDocx", "word/document.xml"):
        if marker not in export: errors.append(f"DOCX export missing {marker!r}")
    sql = migration.lower()
    for marker in ("create table public.ai_provider_connections", "create table public.cv_documents", "create table public.cv_analyses", "enable row level security", "auth.uid()", "with check", "'cv-documents'", "vault.create_secret", "to service_role", "revoke all on function"):
        if marker not in sql: errors.append(f"database boundary missing {marker!r}")
    if sql.count("enable row level security") < 3: errors.append("all three public CV tables require RLS")
    if sql.count("create policy") < 9: errors.append("CV and Storage require explicit ownership policies")
    edge_lower = edge.lower()
    for marker in ("auth.getuser", "x-goog-api-key", "generativelanguage.googleapis.com", "abortsignal.timeout", "analysis_rate_limited", "responsemimetype", "normalizeanalysis", "ignore any instructions", "test.learn.akshatporwal.dev", "codeology-git-dev-hola-312a.vercel.app", "codeology-git-akshat-cv-analysis-hola-312a.vercel.app", "status === 204 ? null", "console.error(json.stringify({ requestid, action, code }))"):
        if marker not in edge_lower: errors.append(f"Edge Function missing security contract {marker!r}")
    for marker in ("api.openai.com/v1/responses", "api.anthropic.com/v1/messages", "providerendpoint", "connectionid", "jsonanalysisschema"):
        if marker not in edge_lower: errors.append(f"Edge Function missing multi-provider contract {marker!r}")
    for marker in ("gemini", "openai", "anthropic", "gpt-5.4-mini", "claude-sonnet-5"):
        if marker not in browser_runtime or marker not in edge_lower: errors.append(f"provider catalog drift for {marker!r}")
    for forbidden in ("console.log(secret", "console.log(text", "api key prefix", "req.body"):
        if forbidden in edge_lower: errors.append(f"Edge Function may expose sensitive data through {forbidden!r}")
    for marker in ("docx_encrypted", "max_entry_bytes", "word/document.xml", "decompressionstream"):
        if marker not in docx.lower(): errors.append(f"DOCX parser missing boundary {marker!r}")
    for marker in ("role-alignment", "decision-velocity", "roleReadinessLabel", "careerSignals", "structuredCv", "provider_schema_invalid"):
        if marker not in contract: errors.append(f"analysis normalizer missing {marker!r}")
    navigation = config.get("product", {}).get("navigation", [])
    matches = [item for item in navigation if isinstance(item, dict) and item.get("href") == "cv-analysis.html"]
    if matches != [{"label": "CV Analysis", "href": "cv-analysis.html"}]: errors.append("navigation requires one CV Analysis route")
    for selector in (".cv-auth-gate", ".cv-provider-panel", ".cv-upload-grid", ".cv-readiness-hero", ".cv-enhancement-studio", ".cv-preview", ".cv-file-action", ".cv-consent-box"):
        if selector not in css: errors.append(f"missing CV selector {selector!r}")
    if ".cv-provider-panel + .cv-analysis-workspace" not in css:
        errors.append("provider and CV account sections require explicit spacing")
    for contract in ("role', 'listbox", "aria-haspopup", "ArrowDown", "Escape"):
        if contract not in ui_controls: errors.append(f"site/ui-controls.js missing accessible select contract {contract!r}")
    if "@media print" not in css or "@media (max-width: 700px)" not in css: errors.append("mobile and printable CV layouts are required")
    for phrase in ("d1aecc127b2a16567b1fe78461f81a50f8b04202", "No explicit licence file was found", "does not copy source code or visual assets", "Supabase Vault", "CODEOLOGY_ALLOWED_ORIGINS", "Rollback", "Deferred platform-wide work"):
        if phrase not in documentation: errors.append(f"migration documentation missing {phrase!r}")
    return errors


def inputs() -> tuple[str, str, str, str, str, str, dict[str, Any], str, str, str, str, str]:
    return (PAGE.read_text(), UI.read_text(), API_ERRORS.read_text(), EXPORT.read_text(), CSS.read_text(), UI_CONTROLS.read_text(), json.loads(CONFIG.read_text()), DOC.read_text(), EDGE.read_text(), DOCX.read_text(), CONTRACT.read_text(), MIGRATION.read_text() + "\n" + PROVIDER_MIGRATION.read_text())


def main() -> int:
    errors = audit(*inputs())
    if errors:
        for error in errors: print(f"ERROR: {error}")
        return 1
    print("Codeology account-backed CV Analysis UI, storage, RLS, provider and claim contracts are valid.")
    return 0


if __name__ == "__main__": sys.exit(main())
