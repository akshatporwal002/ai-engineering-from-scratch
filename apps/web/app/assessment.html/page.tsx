import { redirect } from "next/navigation";

import { loadCertificationRuntimeData } from "../../lib/content/public-content";

export default async function LegacyAssessmentPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const id = (await searchParams).id;
  if (id && loadCertificationRuntimeData().assessmentsById[id]) {
    redirect(`/assessments/${encodeURIComponent(id)}`);
  }
  redirect("/certifications");
}
