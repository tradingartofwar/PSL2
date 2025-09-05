// frontend/lib/query.ts
export function queryFlag(name: string, on: string = "all"): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get(name) === on;
}
