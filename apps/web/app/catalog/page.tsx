import type { Metadata } from "next";
import { CatalogExplorer } from "../../components/public/catalog-explorer";
import { loadPhases } from "../../lib/content/public-content";

export const metadata: Metadata = { title: "Course catalog · Codeology", description: "Search every Codeology academy lesson.", alternates: { canonical: "/catalog" } };
export default async function CatalogPage({ searchParams }: { searchParams: Promise<{ phase?: string }> }) {
  const phase = (await searchParams).phase ?? "all";
  return <main id="main-content" className="public-page"><header className="public-hero"><p className="ui-eyebrow">Academy catalog</p><h1>Find your next lesson.</h1><p>Search the generated curriculum by idea, phase, or language. The source academy remains authoritative.</p></header><CatalogExplorer phases={loadPhases()} initialPhase={phase} /></main>;
}
