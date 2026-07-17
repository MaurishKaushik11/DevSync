let backendUrl = "";
let nodePreviewEnabled = false;

/** Call once from main.tsx with Vite's import.meta.env */
export function initEnv(viteEnv: {
  VITE_BACKEND_URL?: string;
  VITE_NODE_PREVIEW_ENABLED?: string;
}): void {
  backendUrl = String(viteEnv.VITE_BACKEND_URL ?? "").replace(/\/$/, "");
  nodePreviewEnabled =
    String(viteEnv.VITE_NODE_PREVIEW_ENABLED ?? "").toLowerCase() === "true";
}

export function getBackendUrl(): string {
  return backendUrl;
}

export function getGithubOAuthUrl(): string {
  return `${backendUrl}/oauth2/authorization/github`;
}

export function isNodePreviewEnabled(): boolean {
  return nodePreviewEnabled;
}

/** Test helper */
export function setBackendUrlForTests(url: string): void {
  backendUrl = url.replace(/\/$/, "");
}
