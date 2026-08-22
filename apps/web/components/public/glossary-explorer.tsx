"use client";

import { useEffect, useMemo, useState } from "react";
import type { GlossaryEntry } from "../../lib/content/public-content";

export function GlossaryExplorer({ entries }: { entries: GlossaryEntry[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const categories = useMemo(() => [...new Set(entries.map((entry) => entry.category))].sort(), [entries]);
  const results = entries.filter((entry) => {
    const searchable = `${entry.term} ${entry.aliases.join(" ")} ${entry.means} ${entry.related.join(" ")}`.toLowerCase();
    return searchable.includes(query.trim().toLowerCase()) && (category === "all" || entry.category === category);
  });

  return (
    <div className="public-explorer" data-hydrated={hydrated}>
      <div className="public-filters" role="search">
        <label>Search the glossary<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Vector database…" /></label>
        <label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
      </div>
      <p className="public-result-count" role="status">{results.length} of {entries.length} terms</p>
      <div className="glossary-grid">
        {results.map((entry) => (
          <article id={entry.slug} key={entry.slug} className="glossary-entry">
            <span>{entry.letter} · {entry.category}</span>
            <h2><a href={`#${entry.slug}`}>{entry.term}</a></h2>
            {entry.says && <p><strong>What people say:</strong> {entry.says}</p>}
            <p>{entry.means}</p>
            {entry.whyItMatters && <p><strong>Why it matters:</strong> {entry.whyItMatters}</p>}
            {entry.related.length > 0 && <p className="glossary-entry__related"><strong>Related:</strong> {entry.related.join(", ")}</p>}
          </article>
        ))}
      </div>
      {!results.length && <div className="public-empty" role="status"><h2>No matching terms</h2><p>Try a term, alias, or broader category.</p></div>}
    </div>
  );
}
