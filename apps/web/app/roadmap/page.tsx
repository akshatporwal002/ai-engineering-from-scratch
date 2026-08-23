import type { Metadata } from "next";
import { RoadmapRuntime } from "../../components/public/roadmap-runtime";
import { loadPhases, loadRoadmapLegacyPage, loadRoadmapPrerequisites } from "../../lib/content/public-content";

export const metadata: Metadata = {
  title: "AI Engineering Learning Map · Codeology",
  description: "Trace the free AI Engineering Foundations pathway in Codeology across 20 phases and 503 imported lessons.",
  alternates: { canonical: "/roadmap" },
};

export default function RoadmapPage() {
  const phases = loadPhases();
  const prerequisites = loadRoadmapPrerequisites();
  const legacy = loadRoadmapLegacyPage();
  return <>
    <style data-legacy-route="roadmap" dangerouslySetInnerHTML={{ __html: legacy.styles }} />
    <main id="main-content" className="roadmap-page" dangerouslySetInnerHTML={{ __html: legacy.html }} />
    <RoadmapRuntime phases={phases} prerequisites={prerequisites} />
  </>;
}
