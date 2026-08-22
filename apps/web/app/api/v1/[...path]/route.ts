import { NextRequest } from "next/server";

const SAFE_FORWARD_HEADERS = ["accept", "content-type", "x-request-id"];

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const target = new URL(`/api/v1/${path.join("/")}${request.nextUrl.search}`, process.env.NEXT_API_ORIGIN ?? "http://127.0.0.1:8000");
  const headers = new Headers();
  for (const header of SAFE_FORWARD_HEADERS) {
    const value = request.headers.get(header);
    if (value) headers.set(header, value);
  }
  const body = ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer();
  const response = await fetch(target, { method: request.method, headers, body, cache: "no-store" });
  return new Response(response.body, { status: response.status, headers: { "content-type": response.headers.get("content-type") ?? "application/json", "x-request-id": response.headers.get("x-request-id") ?? "" } });
}

export { proxy as DELETE, proxy as GET, proxy as HEAD, proxy as PATCH, proxy as POST };
