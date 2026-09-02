import { readFileSync } from "node:fs";
import path from "node:path";

const source = readFileSync(path.resolve(process.cwd(), "../..", "site/lesson-figures.js"), "utf8");

export function GET() {
  return new Response(source, { headers: { "Cache-Control": "public, max-age=3600", "Content-Type": "text/javascript; charset=utf-8" } });
}
