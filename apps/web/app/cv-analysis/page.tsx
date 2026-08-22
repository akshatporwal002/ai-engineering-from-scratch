import type { Metadata } from "next";
import { ProductWorkspace } from "../../components/product/product-workspace";

export const metadata: Metadata = { title: "CV Analysis workspace · Codeology", description: "Local mock-backed CV analysis workspace.", alternates: { canonical: "/cv-analysis" } };
export default function CvAnalysisPage() { return <ProductWorkspace enabled={process.env.NODE_ENV !== "production"} />; }
