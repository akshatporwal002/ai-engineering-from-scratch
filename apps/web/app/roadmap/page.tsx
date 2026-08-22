import type { Metadata } from "next";
import { loadPhases, loadRoadmapPrerequisites } from "../../lib/content/public-content";

export const metadata: Metadata = { title: "Learning roadmap · Codeology", description: "Navigate the Codeology academy phase dependency map.", alternates: { canonical: "/roadmap" } };
export default function RoadmapPage() {
  const phases = loadPhases();
  const prerequisites = loadRoadmapPrerequisites();
  return (
    <main id="main-content" className="public-page">
      <header className="public-hero"><p className="ui-eyebrow">Learning pathway</p><h1>See how the phases connect.</h1><p>Follow the foundation path or jump to a phase when you already have the prerequisites.</p></header>
      <nav className="roadmap-jump" aria-label="Jump to phase">{phases.map((phase) => <a key={phase.id} href={`#phase-${phase.id}`}>{String(phase.id).padStart(2, "0")}</a>)}</nav>
      <div className="roadmap-list">{phases.map((phase) => (
        <article id={`phase-${phase.id}`} key={phase.id}>
          <div><span>Phase {String(phase.id).padStart(2, "0")}</span><span>{phase.status}</span></div>
          <h2>{phase.name}</h2><p>{phase.desc}</p>
          <p><strong>Prerequisites:</strong> {prerequisites[String(phase.id)]?.length ? prerequisites[String(phase.id)].map((id) => phases.find((item) => item.id === id)?.name).join(", ") : "None"}</p>
          <a href={`/catalog?phase=${phase.id}`}>{phase.lessons.length} lessons</a>
        </article>
      ))}</div>
    </main>
  );
}
