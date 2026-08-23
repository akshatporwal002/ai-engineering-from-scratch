"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import type { GlossaryEntry } from "../../lib/content/public-content";

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("en-US").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
}

function slugify(value: string) {
  return normalize(value).replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function lessonHref(url: string) {
  const match = url.match(/(?:^|\.\.\/|\/)(phases\/[^/?#]+\/[^/?#]+)/);
  if (!match) return url;
  const [, phase, lesson] = match[1].split("/");
  return `/lessons/${phase}/${lesson}`;
}

function ResourceList({ label, resources, source = false }: { label: string; resources: GlossaryEntry["lessons"]; source?: boolean }) {
  if (!resources.length) return null;
  return <div className="glossary-resource-block"><span className="glossary-resource-label">{label}</span><ul className="glossary-resource-list">{resources.map((resource) => {
    const href = source ? resource.url : lessonHref(resource.url);
    const external = /^https?:\/\//.test(href);
    return <li key={`${resource.label}-${resource.url}`}><a className="glossary-resource-link" href={href} target={external ? "_blank" : undefined} rel={external ? "noopener" : undefined}>{source && external ? `${resource.label} ↗` : resource.label}</a></li>;
  })}</ul></div>;
}

export function GlossaryExplorer({ entries, categoryOrder = [] }: { entries: GlossaryEntry[]; categoryOrder?: string[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [hydrated, setHydrated] = useState(false);
  const [letterFocus, setLetterFocus] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const collator = useMemo(() => new Intl.Collator(undefined, { sensitivity: "base", numeric: true }), []);
  const categories = useMemo(() => {
    const present = new Set(entries.map((entry) => entry.category));
    return [...categoryOrder.filter((item) => present.has(item)), ...[...present].filter((item) => !categoryOrder.includes(item)).sort(collator.compare)];
  }, [categoryOrder, collator, entries]);
  const categoryCounts = useMemo(() => new Map(categories.map((item) => [item, entries.filter((entry) => entry.category === item).length])), [categories, entries]);
  const entryByKey = useMemo(() => {
    const result = new Map<string, GlossaryEntry>();
    entries.forEach((entry) => {
      result.set(normalize(entry.term), entry);
      result.set(normalize(entry.slug), entry);
      entry.aliases.forEach((alias) => { if (!result.has(normalize(alias))) result.set(normalize(alias), entry); });
    });
    return result;
  }, [entries]);

  function score(entry: GlossaryEntry, rawQuery: string) {
    const value = normalize(rawQuery);
    if (!value) return 0;
    const term = normalize(entry.term);
    if (term === value) return 0;
    if (term.startsWith(value)) return 1;
    if (term.includes(value)) return 2;
    if (entry.aliases.some((alias) => normalize(alias).includes(value))) return 3;
    const teaching = normalize([entry.category, entry.says, entry.means, entry.whyItMatters, entry.example, entry.confusion, entry.whyCalled, entry.aliases.join(" "), entry.related.join(" "), entry.lessons.map((item) => item.label).join(" "), entry.sources.map((item) => item.label).join(" ")].join(" "));
    if (teaching.includes(value)) return 4;
    const words = value.split(/\s+/).filter(Boolean);
    const complete = `${term} ${entry.aliases.map(normalize).join(" ")} ${teaching}`;
    return words.length > 1 && words.every((word) => complete.includes(word)) ? 5 : -1;
  }

  const results = entries.map((entry) => ({ entry, score: score(entry, query) }))
    .filter((result) => (category === "all" || result.entry.category === category) && result.score !== -1)
    .sort((left, right) => left.score - right.score || collator.compare(left.entry.term, right.entry.term));
  const groupLetters = [...new Set(results.map((result) => result.entry.letter))];
  const groups = groupLetters.map((letter) => {
    const matches = results.filter((result) => result.entry.letter === letter);
    return { letter, entries: matches.map((result) => result.entry), score: Math.min(...matches.map((result) => result.score)) };
  }).sort((left, right) => query && left.score !== right.score ? left.score - right.score : left.letter === "#" ? 1 : right.letter === "#" ? -1 : collator.compare(left.letter, right.letter));
  const activeLetters = new Set(groups.map((group) => group.letter));
  const effectiveLetterFocus = activeLetters.has(letterFocus) ? letterFocus : [...activeLetters].sort(collator.compare)[0] ?? "";

  function updateUrl(nextQuery: string, nextCategory: string, hash: string | null = null) {
    const url = new URL(window.location.href);
    if (nextQuery) url.searchParams.set("q", nextQuery); else url.searchParams.delete("q");
    if (nextCategory !== "all") url.searchParams.set("category", nextCategory); else url.searchParams.delete("category");
    if (hash !== null) url.hash = hash ? `#${hash}` : "";
    history.replaceState(history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }

  function focusTerm(slug: string, scroll = true) {
    document.querySelectorAll(".glossary-entry.is-focused").forEach((node) => node.classList.remove("is-focused"));
    const target = document.getElementById(slug);
    if (!(target instanceof HTMLElement) || !target.classList.contains("glossary-entry")) return false;
    target.classList.add("is-focused");
    target.focus({ preventScroll: true });
    if (scroll) target.scrollIntoView({ block: "start", behavior: "auto" });
    return true;
  }

  function clear(keepFocus = false) {
    setQuery("");
    setCategory("all");
    updateUrl("", "all", "");
    if (keepFocus) requestAnimationFrame(() => searchRef.current?.focus());
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedCategory = params.get("category") ?? "";
    setQuery((params.get("q") ?? "").trim());
    setCategory(categories.find((item) => normalize(item) === normalize(requestedCategory) || slugify(item) === slugify(requestedCategory)) ?? "all");
    setHydrated(true);
  }, [categories]);

  useEffect(() => {
    if (!hydrated) return;
    const slug = decodeURIComponent(window.location.hash.replace(/^#/, ""));
    if (slug) requestAnimationFrame(() => focusTerm(entryByKey.get(normalize(slug))?.slug ?? slug));
  }, [category, entryByKey, hydrated, query]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const editable = target?.matches("input, textarea, select") || target?.isContentEditable;
      if (event.key === "/" && !editable && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      } else if (event.key === "Escape" && (query || category !== "all")) {
        event.preventDefault();
        clear(true);
      }
    }
    function onHashChange() {
      const slug = decodeURIComponent(window.location.hash.replace(/^#/, ""));
      if (slug) focusTerm(entryByKey.get(normalize(slug))?.slug ?? slug);
    }
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("hashchange", onHashChange);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("hashchange", onHashChange);
    };
  }, [category, entryByKey, query]);

  function rove(event: ReactKeyboardEvent<HTMLButtonElement>, buttons: HTMLButtonElement[]) {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key) || !buttons.length) return;
    event.preventDefault();
    const index = buttons.indexOf(event.currentTarget);
    const direction = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
    const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + direction + buttons.length) % buttons.length;
    buttons.forEach((button, buttonIndex) => { button.tabIndex = buttonIndex === next ? 0 : -1; });
    buttons[next]?.focus();
  }

  return <div className="glossary-explorer" data-hydrated={hydrated}>
    <aside className="glossary-rail" aria-label="Glossary filters">
      <div className="glossary-search-control">
        <label className="glossary-field-label" htmlFor="glossarySearch">Search the ledger</label>
        <div className="glossary-search-row">
          <input ref={searchRef} type="search" className="glossary-search" id="glossarySearch" placeholder="Term, alias, or idea" autoComplete="off" aria-describedby="glossaryCount" value={query} onChange={(event) => { const value = event.target.value; setQuery(value); updateUrl(value.trim(), category, ""); }} />
          <button className="glossary-clear" type="button" disabled={!query && category === "all"} onClick={() => clear(true)}>Clear</button>
        </div>
      </div>
      <div className="glossary-filter-block">
        <span className="glossary-section-label" id="glossaryCategoryLabel">Learning area</span>
        <div className="glossary-filter-list" role="group" aria-labelledby="glossaryCategoryLabel">
          {["all", ...categories].map((item) => <button key={item} className="glossary-filter" type="button" data-category={item} aria-pressed={category === item} tabIndex={category === item ? 0 : -1} onClick={(event) => { setCategory(item); updateUrl(query.trim(), item, ""); event.currentTarget.focus(); }} onKeyDown={(event) => rove(event, [...event.currentTarget.parentElement!.querySelectorAll<HTMLButtonElement>("[data-category]")])}><span>{item === "all" ? "All terms" : item}</span><span className="glossary-filter-count">{item === "all" ? entries.length : categoryCounts.get(item)}</span></button>)}
        </div>
      </div>
      <div className="glossary-filter-block">
        <span className="glossary-section-label" id="glossaryAlphabetLabel">Jump to letter</span>
        <div className="glossary-letter-list" role="group" aria-labelledby="glossaryAlphabetLabel" dir="ltr">
          {Array.from({ length: 26 }, (_, index) => String.fromCharCode(65 + index)).map((letter) => <button key={letter} className="glossary-letter" type="button" data-letter={letter} aria-label={`Jump to letter ${letter}`} tabIndex={activeLetters.has(letter) && letter === effectiveLetterFocus ? 0 : -1} disabled={!activeLetters.has(letter)} onClick={(event) => { setLetterFocus(letter); const section = document.getElementById(`letter-${letter}`); section?.focus({ preventScroll: true }); section?.scrollIntoView({ block: "start", behavior: "auto" }); event.currentTarget.tabIndex = 0; }} onKeyDown={(event) => { rove(event, [...event.currentTarget.parentElement!.querySelectorAll<HTMLButtonElement>("[data-letter]:not(:disabled)")]); setLetterFocus(document.activeElement?.getAttribute("data-letter") ?? letter); }}>{letter}</button>)}
        </div>
      </div>
    </aside>
    <section className="glossary-ledger" aria-labelledby="glossaryResultsHeading">
      <header className="glossary-ledger-header">
        <div><span className="glossary-section-label">Live reference</span><h2 id="glossaryResultsHeading">Reference entries</h2></div>
        <p className="glossary-result-count" id="glossaryCount">{`${results.length} of ${entries.length} terms${category !== "all" ? ` · ${category}` : ""}`}</p>
        <p className="glossary-visually-hidden" aria-live="polite" aria-atomic="true">{`${results.length} of ${entries.length} terms shown.`}</p>
      </header>
      <div id="glossaryList">{groups.length ? groups.map((group) => <section className="glossary-letter-group" id={`letter-${group.letter === "#" ? "other" : group.letter}`} tabIndex={-1} aria-labelledby={`letter-${group.letter === "#" ? "other" : group.letter}-title`} key={group.letter}>
        <header className="glossary-letter-heading"><h3 id={`letter-${group.letter === "#" ? "other" : group.letter}-title`}>{group.letter}</h3><span className="glossary-letter-line" aria-hidden="true" /><span className="glossary-letter-total">{`${group.entries.length} ${group.entries.length === 1 ? "entry" : "entries"}`}</span></header>
        {group.entries.map((entry) => <GlossaryArticle key={entry.slug} entry={entry} sourceIndex={entries.indexOf(entry)} entryByKey={entryByKey} navigate={(slug, label) => { const match = entryByKey.get(normalize(slug)) ?? entryByKey.get(normalize(label)); setQuery(""); setCategory("all"); updateUrl("", "all", match?.slug ?? slug); requestAnimationFrame(() => focusTerm(match?.slug ?? slug)); }} />)}
      </section>) : <div className="glossary-empty"><h3>No matching reference</h3><p>Try a broader idea, another learning area, or reset the ledger to see every term.</p><button className="glossary-clear" type="button" onClick={() => clear(true)}>Clear filters</button></div>}</div>
    </section>
  </div>;
}

function GlossaryArticle({ entry, sourceIndex, entryByKey, navigate }: { entry: GlossaryEntry; sourceIndex: number; entryByKey: Map<string, GlossaryEntry>; navigate: (slug: string, label: string) => void }) {
  const hasDetails = Boolean(entry.confusion || entry.whyCalled || entry.lessons.length || entry.sources.length);
  return <article className="glossary-entry" id={entry.slug} tabIndex={-1} aria-labelledby={`${entry.slug}-title`}>
    <div className="glossary-entry-topline"><div className="glossary-entry-meta"><span className="glossary-entry-index">{`REF ${String(sourceIndex + 1).padStart(3, "0")}`}</span><span className="glossary-entry-category">{entry.category}</span></div><div className="glossary-entry-actions"><CopyLink entry={entry} /></div></div>
    <h4 className="glossary-term-heading" id={`${entry.slug}-title`} dir="auto">{entry.term}</h4>
    {entry.aliases.length > 0 && <p className="glossary-aliases">{`Also called · ${entry.aliases.join(" · ")}`}</p>}
    <div className="glossary-meaning"><span className="glossary-entry-label">Working definition</span><p>{entry.means || "Definition in progress."}</p></div>
    {(entry.whyItMatters || entry.example || entry.says) && <div className="glossary-teaching-grid">{entry.whyItMatters && <div className="glossary-teaching-block"><span className="glossary-entry-label">Why it matters</span><p>{entry.whyItMatters}</p></div>}{entry.example && <div className="glossary-teaching-block"><span className="glossary-entry-label">In practice</span><p>{entry.example}</p></div>}{entry.says && <div className="glossary-teaching-block glossary-shortcut"><span className="glossary-entry-label">Common shortcut</span><p>{`“${entry.says}”`}</p></div>}</div>}
    {hasDetails && <details className="glossary-details"><summary>Distinctions and evidence</summary><div className="glossary-details-body">{entry.confusion && <div><span className="glossary-entry-label">Do not confuse it with</span><p>{entry.confusion}</p></div>}{entry.whyCalled && <div><span className="glossary-entry-label">Why it is called this</span><p>{entry.whyCalled}</p></div>}<ResourceList label="Learn it in the course" resources={entry.lessons} /><ResourceList label="Primary sources" resources={entry.sources} source /></div></details>}
    {entry.related.length > 0 && <nav className="glossary-related" aria-label={`Terms related to ${entry.term}`}><span className="glossary-resource-label">Related terms</span><ul className="glossary-related-list">{entry.related.map((label) => { const match = entryByKey.get(normalize(label)); const slug = match?.slug ?? slugify(label); return slug === entry.slug ? null : <li key={label}><a className="glossary-related-link" href={`#${slug}`} onClick={(event) => { event.preventDefault(); navigate(slug, label); }}>{label}</a></li>; })}</ul></nav>}
  </article>;
}

function CopyLink({ entry }: { entry: GlossaryEntry }) {
  const [label, setLabel] = useState("Copy link");
  async function copy() {
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = entry.slug;
    try {
      await navigator.clipboard.writeText(url.toString());
      setLabel("Copied");
    } catch {
      setLabel("Copy failed");
    }
    window.setTimeout(() => setLabel("Copy link"), 1200);
  }
  return <button className="glossary-copy-link" type="button" aria-label={label === "Copied" ? "Link copied" : `Copy link to ${entry.term}`} onClick={copy}>{label}</button>;
}
