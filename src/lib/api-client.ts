import type { ApiErrorBody } from "./dto";

/** A failed API call with the server's user-facing reason. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    reason: string,
  ) {
    super(reason);
    this.name = "ApiError";
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, headers: { "content-type": "application/json", ...init?.headers } });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    throw new ApiError(0, "network", "Can't reach the server. Check your connection and try again.");
  }
  if (res.ok) return (await res.json()) as T;
  let body: Partial<ApiErrorBody> = {};
  try {
    body = await res.json();
  } catch {
    // Non-JSON error page; fall through to a generic message.
  }
  throw new ApiError(res.status, body.error ?? "http_error", body.reason ?? `Request failed (${res.status})`);
}

export const apiGet = <T>(url: string, signal?: AbortSignal) => request<T>(url, { signal });

export const apiPost = <T>(url: string, body: unknown) =>
  request<T>(url, { method: "POST", body: JSON.stringify(body) });
