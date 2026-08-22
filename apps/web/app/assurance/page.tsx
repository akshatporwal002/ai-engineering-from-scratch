import type { Metadata } from "next";
import { EditorialPage } from "../../components/public/editorial-page";
import { loadEditorialPage } from "../../lib/content/public-content";

const page = loadEditorialPage("assurance");
export const metadata: Metadata = { title: page.title, description: page.description, alternates: { canonical: "/assurance" } };
export default function AssurancePage() { return <EditorialPage page={page} />; }
