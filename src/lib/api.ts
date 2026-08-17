export const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function requestHeaders(init: RequestInit, token?: string) {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return headers;
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = typeof window === "undefined" ? undefined : localStorage.getItem("accessToken") ?? undefined;
  let response = await fetch(`${apiUrl}/api${path}`, { ...init, credentials: "include", headers: requestHeaders(init, token) });
  if (response.status === 401 && !path.startsWith("/auth/")) {
    const refreshed = await fetch(`${apiUrl}/api/auth/refresh`, { method: "POST", credentials: "include" });
    if (refreshed.ok) {
      const session = await refreshed.json() as { accessToken: string };
      localStorage.setItem("accessToken", session.accessToken);
      response = await fetch(`${apiUrl}/api${path}`, { ...init, credentials: "include", headers: requestHeaders(init, session.accessToken) });
    } else if (typeof window !== "undefined") localStorage.removeItem("accessToken");
  }
  return response;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await apiFetch(path, init);
  if (!response.ok) { const body = await response.json().catch(() => null); throw new Error(body?.message ?? "Request failed"); }
  return response.json() as Promise<T>;
}
