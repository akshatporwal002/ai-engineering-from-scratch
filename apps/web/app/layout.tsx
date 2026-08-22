import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Codeology migration experiment",
  description: "A local-only Next.js and FastAPI experiment.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
