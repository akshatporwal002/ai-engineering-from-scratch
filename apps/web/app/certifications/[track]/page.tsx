import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadCertificationTrack, loadCertificationTracks } from "../../../lib/content/public-content";

export function generateStaticParams() { return loadCertificationTracks().map((track) => ({ track: track.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ track: string }> }): Promise<Metadata> {
  const track = loadCertificationTrack((await params).track);
  return track ? { title: track.credential + " · Codeology", description: track.summary, alternates: { canonical: "/certifications/" + track.slug } } : {};
}
export default async function CertificationTrackPage({ params }: { params: Promise<{ track: string }> }) {
  const track = loadCertificationTrack((await params).track);
  if (!track) notFound();
  return (
    <main id="main-content" className="public-page">
      <header className="public-hero"><p className="ui-eyebrow">{track.examCode} · {track.level}</p><h1>{track.credential}</h1><p>{track.summary}</p><p><strong>For:</strong> {track.audience}</p></header>
      <section className="cert-facts" aria-label="Exam facts"><div><strong>{track.exam.items}</strong><span>items</span></div><div><strong>{track.exam.timeLimitMinutes}</strong><span>minutes</span></div><div><strong>USD {track.exam.feeUsd}</strong><span>official fee</span></div><div><strong>{track.lessons.length}</strong><span>lessons</span></div></section>
      <section className="cert-domains" aria-labelledby="domains-title"><h2 id="domains-title">Blueprint domains</h2>{track.domains.map((domain) => <article key={domain.id}><strong>{domain.weight}%</strong><div><h3>{domain.name}</h3><ul>{domain.objectives.map((objective) => <li key={objective}>{objective}</li>)}</ul></div></article>)}</section>
      <section className="cert-plans" aria-labelledby="plans-title"><h2 id="plans-title">Study plans</h2><div>{track.studyPlans.map((plan) => <article key={plan.id}><span>{plan.durationDays} days · {plan.hoursPerWeek} hrs/week</span><h3>{plan.label}</h3><ol>{plan.milestones.map((step) => <li key={step}>{step}</li>)}</ol></article>)}</div></section>
      <aside className="public-boundary"><strong>Practice boundary</strong><p>This public route presents the source track. Assessment execution and saved attempts are outside this workstream.</p></aside>
    </main>
  );
}
