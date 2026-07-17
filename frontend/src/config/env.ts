let backendUrl = "";

/** Call once from main.tsx with Vite's import.meta.env */
export function initEnv(viteEnv: { VITE_BACKEND_URL?: string }): void {
  backendUrl = String(viteEnv.VITE_BACKEND_URL ?? "").replace(/\/$/, "");
}

export function getBackendUrl(): string {
  return backendUrl;
}

export function getGithubOAuthUrl(): string {
  return `${backendUrl}/oauth2/authorization/github`;
}

/** Test helper */
export function setBackendUrlForTests(url: string): void {
  backendUrl = url.replace(/\/$/, "");
}
