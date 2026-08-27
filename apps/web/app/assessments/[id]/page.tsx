import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CertificationRuntime } from "../../../components/public/certification-runtime";
import { loadAssessmentLegacyPage, loadCertificationRuntimeData, loadPhases } from "../../../lib/content/public-content";

export function generateStaticParams() {
  return Object.keys(loadCertificationRuntimeData().assessmentsById).map((id) => ({ id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const id = (await params).id;
  const assessment = loadCertificationRuntimeData().assessmentsById[id] as { title?: string } | undefined;
  return assessment?.title ? { title: `${assessment.title} · Codeology`, alternates: { canonical: `/assessments/${id}` } } : {};
}

export default async function AssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const data = loadCertificationRuntimeData();
  if (!data.assessmentsById[id]) notFound();
  const legacy = loadAssessmentLegacyPage();
  return <>
    <style data-legacy-route="assessment" dangerouslySetInnerHTML={{ __html: legacy.styles }} />
    <main id="main" className="cert-page" dangerouslySetInnerHTML={{ __html: legacy.html }} />
    <CertificationRuntime kind="assessment" assessmentId={id} data={data} phases={loadPhases()} />
  </>;
}
