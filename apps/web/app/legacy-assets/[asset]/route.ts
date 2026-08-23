import { readFileSync } from "node:fs";
import path from "node:path";

const assets = new Set(["progress.js", "roadmap.js", "ui-controls.js"]);

export async function GET(_request: Request, { params }: { params: Promise<{ asset: string }> }) {
  const { asset } = await params;
  if (!assets.has(asset)) return new Response("Not found", { status: 404 });
  const source = readFileSync(path.resolve(process.cwd(), "../..", "site", asset), "utf8");
  return new Response(source, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "text/javascript; charset=utf-8",
    },
  });
}
