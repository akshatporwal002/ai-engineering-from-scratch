import type { Metadata } from "next";
import { SiteShell } from "../components/shell/site-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Codeology migration experiment",
  description: "A local-only Next.js and FastAPI experiment.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-theme="light"><body><SiteShell>{children}</SiteShell></body></html>;
}
