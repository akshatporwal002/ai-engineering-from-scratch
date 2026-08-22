import type { Metadata } from "next";
import { loadCertificationProgram, loadCertificationTracks } from "../../lib/content/public-content";

export const metadata: Metadata = { title: "Certification preparation · Codeology", description: "Independent open-source certification preparation paths.", alternates: { canonical: "/certifications" } };
export default function CertificationsPage() {
  const program = loadCertificationProgram();
  const tracks = loadCertificationTracks();
  return (
    <main id="main-content" className="public-page">
      <header className="public-hero"><p className="ui-eyebrow">{program.name}</p><h1>Prepare by building the real systems.</h1><p>{program.summary}</p></header>
      <aside className="public-notice"><strong>Current access</strong><p>{program.accessNotice}</p></aside>
      <section className="cert-grid" aria-labelledby="track-title"><h2 id="track-title">Claude certification tracks</h2><div>{tracks.map((track) => (
        <a key={track.id} href={`/certifications/${track.slug}`}><span>{track.examCode} · {track.level}</span><h3>{track.credential}</h3><p>{track.summary}</p><small>{track.lessons.length} lessons · {track.domains.length} domains</small></a>
      ))}</div></section>
      <aside className="public-boundary"><strong>Independent preparation</strong><p>{program.disclaimer}</p><p>{program.scoringNotice}</p></aside>
    </main>
  );
}
