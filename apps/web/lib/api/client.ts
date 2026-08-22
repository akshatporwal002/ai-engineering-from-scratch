import type { ApiErrorEnvelope } from "./generated";

export class ApiClientError extends Error {
  constructor(public code: string, message: string, public requestId?: string) { super(message); }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/v1${path}`, { ...init, headers: { accept: "application/json", ...(init.body ? { "content-type": "application/json" } : {}), ...init.headers } });
  if (response.status === 204) return undefined as T;
  const value = await response.json() as T | ApiErrorEnvelope;
  if (!response.ok) {
    const error = value as ApiErrorEnvelope;
    throw new ApiClientError(error.code || "request_failed", error.message || "The request could not be completed.", error.request_id);
  }
  return value as T;
}
