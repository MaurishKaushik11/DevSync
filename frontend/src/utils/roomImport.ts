/** Max file size accepted on import (backend). */
export const IMPORT_MAX_FILE_BYTES = 25 * 1024 * 1024;

/** Files larger than this are collaboration-disabled / read-only. */
export const COLLAB_READONLY_THRESHOLD_BYTES = 1024 * 1024;

/**
 * Accepts public GitHub repository URLs (https://github.com/owner/repo[...]).
 */
export function isPublicGitHubRepoUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    const host = url.hostname.toLowerCase();
    if (host !== "github.com" && host !== "www.github.com") return false;
    const parts = url.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
    return parts.length >= 2 && Boolean(parts[0]) && Boolean(parts[1]);
  } catch {
    return false;
  }
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    const kb = bytes / 1024;
    return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  }
  const mb = bytes / (1024 * 1024);
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

export function effectiveCanEdit(
  roleWritable: boolean,
  collaborationEnabled: boolean | null | undefined
): boolean {
  return roleWritable && collaborationEnabled !== false;
}
