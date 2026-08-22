import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  devIndicators: false,
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname, "../.."),
  async redirects() {
    return [
      { source: "/index.html", destination: "/", permanent: true },
      { source: "/about.html", destination: "/about", permanent: true },
      { source: "/credits.html", destination: "/credits", permanent: true },
      { source: "/glossary.html", destination: "/glossary", permanent: true },
      { source: "/assurance.html", destination: "/assurance", permanent: true },
      { source: "/catalog.html", destination: "/catalog", permanent: true },
      { source: "/prereqs.html", destination: "/roadmap", permanent: true },
      { source: "/certifications.html", destination: "/certifications", permanent: true },
      { source: "/cv-analysis.html", destination: "/cv-analysis", permanent: true },
    ];
  },
};

export default nextConfig;
