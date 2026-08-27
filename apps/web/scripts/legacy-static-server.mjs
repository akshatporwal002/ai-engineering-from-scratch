import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, normalize, resolve, sep } from "node:path";

const root = resolve(process.cwd(), "../../site");
const host = "127.0.0.1";
const port = 4173;
const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

function fileFor(url) {
  const pathname = decodeURIComponent(new URL(url, `http://${host}`).pathname);
  const relative = normalize(pathname).replace(/^[/\\]+/, "");
  const target = resolve(root, relative || "index.html");
  return target === root || target.startsWith(`${root}${sep}`) ? target : null;
}

const server = createServer(async (request, response) => {
  if (!request.url || request.method !== "GET") {
    response.writeHead(405).end();
    return;
  }

  const target = fileFor(request.url);
  if (!target) {
    response.writeHead(403).end();
    return;
  }

  try {
    const details = await stat(target);
    if (!details.isFile()) {
      response.writeHead(404).end();
      return;
    }
    const content = await readFile(target);
    response.writeHead(200, {
      "content-length": content.length,
      "content-type": types[extname(target)] ?? "application/octet-stream",
      "cache-control": "no-store",
      connection: "close",
    });
    response.end(content);
  } catch {
    response.writeHead(404).end();
  }
});

server.listen(port, host, () => {
  console.log(`Legacy static test server listening on http://${host}:${port}`);
});
