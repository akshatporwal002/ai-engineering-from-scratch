import type { Metadata } from "next";
import { CertificationRuntime } from "../../components/public/certification-runtime";
import { loadCertificationLegacyPage, loadCertificationRuntimeData, loadPhases } from "../../lib/content/public-content";

export const metadata: Metadata = { title: "Certification preparation · Codeology", description: "Independent open-source certification preparation paths.", alternates: { canonical: "/certifications" } };
export default function CertificationsPage() {
  const legacy = loadCertificationLegacyPage("catalog");
  return <>
    <style data-legacy-route="certifications" dangerouslySetInnerHTML={{ __html: legacy.styles }} />
    <main id="main-content" className="cert-page" dangerouslySetInnerHTML={{ __html: legacy.html }} />
    <CertificationRuntime kind="catalog" data={loadCertificationRuntimeData()} phases={loadPhases()} />
  </>;
}
