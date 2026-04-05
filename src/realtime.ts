/** Base URL for the Mosaic API (no trailing slash). Empty = same origin (Vite proxy in dev). */
const origin = (import.meta.env.VITE_API_ORIGIN ?? "").replace(/\/$/, "");

export function apiUrl(path: string): string {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  if (!origin) {
    return path;
  }
  return `${origin}${path}`;
}

export function wsUrl(path: string): string {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  if (!origin) {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.host}${path}`;
  }
  const base = origin.startsWith("http") ? origin : `https://${origin}`;
  const u = new URL(base);
  u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
  return `${u.origin}${path}`;
}
