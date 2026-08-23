import type { Metadata } from "next";
import { GlossaryExplorer } from "../../components/public/glossary-explorer";
import { loadGlossary, loadGlossaryLegacyPage } from "../../lib/content/public-content";

export const metadata: Metadata = { title: "AI engineering glossary · Codeology", description: "Search practical AI engineering definitions and related terms.", alternates: { canonical: "/glossary" } };
export default function GlossaryPage() {
  const entries = loadGlossary();
  const legacy = loadGlossaryLegacyPage();
  const categoryCount = new Set(entries.map((entry) => entry.category)).size;
  return <>
    <style data-legacy-route="glossary" dangerouslySetInnerHTML={{ __html: legacy.styles }} />
    <main id="main-content" className="glossary-page">
      <div className="container">
        <header className="glossary-masthead">
          <div>
            <p className="glossary-kicker">Imported reference · AI Engineering Foundations</p>
            <h1>AI Engineering Glossary</h1>
            <p className="glossary-deck">Precise working definitions for the systems you build. Start with the meaning, then use the examples, distinctions, and lesson links to turn vocabulary into judgment.</p>
          </div>
          <div className="glossary-stats" aria-label="Glossary statistics">
            <div className="glossary-stat"><strong>{entries.length}</strong><span className="glossary-stat-label">Terms indexed</span></div>
            <div className="glossary-stat"><strong>{categoryCount}</strong><span className="glossary-stat-label">Learning areas</span></div>
            <div className="glossary-stat"><strong>A-Z</strong><span className="glossary-stat-label">Stable deep links</span></div>
          </div>
        </header>
        <GlossaryExplorer entries={entries} categoryOrder={legacy.categories} />
      </div>
    </main>
  </>;
}
