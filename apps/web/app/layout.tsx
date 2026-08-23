import type { Metadata } from "next";
import { SiteShell } from "../components/shell/site-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Codeology — Learn freely. Build for real. Prove your work.",
  description: "A free, open-tool engineering academy: learn from excellent curricula, build realistic projects in your own environment, and turn immutable work into inspectable evidence.",
};

const themeScript = `try{var t=localStorage.getItem('theme');document.documentElement.dataset.theme=t==='dark'||t==='light'?t:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}catch(e){document.documentElement.dataset.theme='light'}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="light" data-product="codeology" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body><SiteShell>{children}</SiteShell></body>
    </html>
  );
}
