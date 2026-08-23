import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CertificationRuntime } from "../../../components/public/certification-runtime";
import { loadCertificationLegacyPage, loadCertificationRuntimeData, loadCertificationTrack, loadCertificationTracks, loadPhases } from "../../../lib/content/public-content";

export function generateStaticParams() { return loadCertificationTracks().map((track) => ({ track: track.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ track: string }> }): Promise<Metadata> {
  const track = loadCertificationTrack((await params).track);
  return track ? { title: track.credential + " · Codeology", description: track.summary, alternates: { canonical: "/certifications/" + track.slug } } : {};
}
export default async function CertificationTrackPage({ params }: { params: Promise<{ track: string }> }) {
  const routeTrack = (await params).track;
  const track = loadCertificationTrack(routeTrack);
  if (!track) notFound();
  const legacy = loadCertificationLegacyPage("track");
  return <>
    <style data-legacy-route="certification-track" dangerouslySetInnerHTML={{ __html: legacy.styles }} />
    <main id="main-content" className="cert-page" dangerouslySetInnerHTML={{ __html: legacy.html }} />
    <CertificationRuntime kind="track" track={track.id} data={loadCertificationRuntimeData()} phases={loadPhases()} />
  </>;
}
