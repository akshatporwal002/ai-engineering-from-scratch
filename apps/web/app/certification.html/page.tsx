import { redirect } from "next/navigation";
import { loadCertificationTrack } from "../../lib/content/public-content";

export default async function LegacyCertificationPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const id = (await searchParams).id;
  const track = id ? loadCertificationTrack(id) : undefined;
  redirect(track ? "/certifications/" + track.slug : "/certifications");
}
