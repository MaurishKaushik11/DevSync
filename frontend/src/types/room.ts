export type RoomRole = "HOST" | "EDITOR" | "VIEWER";

/**
 * Room file as consumed by the workspace.
 * `id` is the OT/Redis document id (stable filename, e.g. index.html).
 * `persistenceId` is the Postgres RoomFile UUID used by the save API.
 * `content` is null when the API deferred loading (large / read-only files).
 */
export interface RoomFile {
  id: string;
  persistenceId: string;
  path: string;
  language: string;
  content: string | null;
  sizeBytes: number;
  collaborationEnabled: boolean;
}

export interface RoomSummary {
  id: string;
  shareId: string;
  name: string;
  role: RoomRole;
  activeSessionId: string | null;
  lastActivityAt: string;
}

export interface RoomDetail extends RoomSummary {
  files: RoomFile[];
}

export interface CreateRoomRequest {
  name: string;
}

export interface ImportRoomRequest {
  repositoryUrl: string;
  name?: string;
}

export interface RenameRoomRequest {
  name: string;
}

export interface JoinRoomRequest {
  displayName: string;
}

export interface JoinRoomResponse {
  accessToken: string;
  guest: {
    id: string;
    displayName: string;
    role: RoomRole;
  };
  room: RoomDetail;
}

export interface SaveFileRequest {
  content: string;
}

export interface FileContentResponse {
  content: string;
}

export function canEditRole(role: RoomRole | null | undefined): boolean {
  return role === "HOST" || role === "EDITOR";
}
