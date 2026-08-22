"use client";

import { useEffect, useMemo, useState } from "react";
import type { PhaseSummary } from "../../lib/content/public-content";

export function CatalogExplorer({ phases, initialPhase = "all" }: { phases: PhaseSummary[]; initialPhase?: string }) {
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState("all");
  const [phaseId, setPhaseId] = useState(initialPhase);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const lessons = useMemo(() => phases.flatMap((phase) => phase.lessons.map((lesson) => ({ ...lesson, phase }))), [phases]);
  const languages = [...new Set(lessons.flatMap((lesson) => lesson.lang.split(",").map((item) => item.trim())).filter(Boolean))].sort();
  const results = lessons.filter((lesson) => {
    const searchable = `${lesson.name} ${lesson.summary ?? ""} ${lesson.phase.name} ${lesson.lang}`.toLowerCase();
    return searchable.includes(query.trim().toLowerCase()) && (language === "all" || lesson.lang.includes(language)) && (phaseId === "all" || String(lesson.phase.id) === phaseId);
  });

  return (
    <div className="public-explorer" data-hydrated={hydrated}>
      <div className="public-filters" role="search">
        <label>Search lessons<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Attention, RAG, agents…" /></label>
        <label>Language<select value={language} onChange={(event) => setLanguage(event.target.value)}><option value="all">All languages</option>{languages.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Phase<select value={phaseId} onChange={(event) => setPhaseId(event.target.value)}><option value="all">All phases</option>{phases.map((phase) => <option key={phase.id} value={phase.id}>{String(phase.id).padStart(2, "0")} · {phase.name}</option>)}</select></label>
      </div>
      <p className="public-result-count" role="status">{results.length} of {lessons.length} lessons</p>
      <div className="public-list">
        {results.map((lesson) => (
          <article key={lesson.url} className="public-list__item">
            <div><span>{String(lesson.phase.id).padStart(2, "0")} · {lesson.phase.name}</span><span>{lesson.type} · {lesson.lang}</span></div>
            <h2>{lesson.name}</h2>
            {lesson.summary && <p>{lesson.summary}</p>}
            <a href={lesson.url} target="_blank" rel="noopener">Open source lesson <span aria-hidden="true">↗</span></a>
          </article>
        ))}
      </div>
      {!results.length && <div className="public-empty" role="status"><h2>No matching lessons</h2><p>Try a broader term or reset the language filter.</p></div>}
    </div>
  );
}
