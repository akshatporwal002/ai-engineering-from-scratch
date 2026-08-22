import type { Metadata } from "next";
import { EditorialPage } from "../../components/public/editorial-page";
import { loadEditorialPage } from "../../lib/content/public-content";

const page = loadEditorialPage("credits");
export const metadata: Metadata = { title: page.title, description: page.description, alternates: { canonical: "/credits" } };
export default function CreditsPage() { return <EditorialPage page={page} />; }
