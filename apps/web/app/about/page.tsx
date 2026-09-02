import type { Metadata } from "next";
import { EditorialPage } from "../../components/public/editorial-page";
import { loadEditorialPage } from "../../lib/content/public-content";

const page = loadEditorialPage("about");
export const metadata: Metadata = { title: page.title, description: page.description, alternates: { canonical: "/about" } };
export default function AboutPage() { return <EditorialPage page={page} />; }
