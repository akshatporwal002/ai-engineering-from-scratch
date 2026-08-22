import type { Metadata } from "next";
import { GlossaryExplorer } from "../../components/public/glossary-explorer";
import { loadGlossary } from "../../lib/content/public-content";

export const metadata: Metadata = { title: "AI engineering glossary · Codeology", description: "Search practical AI engineering definitions and related terms.", alternates: { canonical: "/glossary" } };
export default function GlossaryPage() {
  return <main id="main-content" className="public-page"><header className="public-hero"><p className="ui-eyebrow">Practical reference</p><h1>AI engineering glossary.</h1><p>Read the direct definition first, then connect each term to a system you can build.</p></header><GlossaryExplorer entries={loadGlossary()} /></main>;
}
