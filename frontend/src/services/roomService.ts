import { apiClient } from "./apiClient";
import type {
  CreateRoomRequest,
  FileContentResponse,
  ImportRoomRequest,
  JoinRoomRequest,
  JoinRoomResponse,
  RenameRoomRequest,
  RoomDetail,
  RoomFile,
  RoomRole,
  RoomSummary,
  SaveFileRequest,
} from "../types/room";

/** Raw shapes returned by the Spring Boot API */
export interface ApiRoomFile {
  id: string;
  name?: string;
  path?: string;
  language?: string;
  content?: string | null;
  sizeBytes?: number;
  collaborationEnabled?: boolean;
  updatedAt?: string;
}

interface ApiRoom {
  id: string;
  name: string;
  shareId: string;
  activeSessionId: string | null;
  role: string;
  files?: ApiRoomFile[];
  lastActivityAt: string;
  createdAt?: string;
}

interface ApiGuestJoinResponse {
  room: ApiRoom;
  sessionId?: string;
  guestAccessToken?: string;
  accessToken?: string;
  tokenType?: string;
  expiresInSeconds?: number;
  guest: {
    id: string;
    displayName: string;
    role?: string;
  };
}

function asRole(role: string | undefined): RoomRole {
  if (role === "HOST" || role === "EDITOR" || role === "VIEWER") {
    return role;
  }
  return "VIEWER";
}

/**
 * Maps API file payload → workspace RoomFile.
 * OT id/path come from `name` (or path); UUID `id` becomes persistenceId.
 */
export function normalizeRoomFile(file: ApiRoomFile): RoomFile {
  const path = (file.path || file.name || file.id || "").trim();
  if (!path) {
    throw new Error("Room file is missing a name/path");
  }
  const content =
    file.content === undefined || file.content === null ? null : file.content;
  const sizeBytes =
    typeof file.sizeBytes === "number" && Number.isFinite(file.sizeBytes)
      ? file.sizeBytes
      : content != null
        ? typeof TextEncoder !== "undefined"
          ? new TextEncoder().encode(content).length
          : content.length
        : 0;
  return {
    // OT / Redis document id must remain the filename for live preview sync.
    id: path,
    persistenceId: file.id,
    path,
    language: file.language || "plaintext",
    content,
    sizeBytes,
    collaborationEnabled: file.collaborationEnabled !== false,
  };
}

export function normalizeRoom(room: ApiRoom): RoomDetail {
  return {
    id: room.id,
    shareId: room.shareId,
    name: room.name,
    role: asRole(room.role),
    activeSessionId: room.activeSessionId,
    lastActivityAt: room.lastActivityAt,
    files: (room.files ?? []).map(normalizeRoomFile),
  };
}

function toSummary(room: RoomDetail): RoomSummary {
  return {
    id: room.id,
    shareId: room.shareId,
    name: room.name,
    role: room.role,
    activeSessionId: room.activeSessionId,
    lastActivityAt: room.lastActivityAt,
  };
}

export async function createRoom(
  payload: CreateRoomRequest
): Promise<RoomDetail> {
  const { data } = await apiClient.post<ApiRoom>("/api/rooms", payload);
  return normalizeRoom(data);
}

export async function importRoom(
  payload: ImportRoomRequest
): Promise<RoomDetail> {
  const body: ImportRoomRequest = {
    repositoryUrl: payload.repositoryUrl.trim(),
  };
  const name = payload.name?.trim();
  if (name) {
    body.name = name;
  }
  const { data } = await apiClient.post<ApiRoom>("/api/rooms/import", body);
  return normalizeRoom(data);
}

export async function listRooms(): Promise<RoomSummary[]> {
  const { data } = await apiClient.get<ApiRoom[]>("/api/rooms");
  return data.map((room) => toSummary(normalizeRoom(room)));
}

export async function getRoom(roomId: string): Promise<RoomDetail> {
  const { data } = await apiClient.get<ApiRoom>(`/api/rooms/${roomId}`);
  return normalizeRoom(data);
}

export async function renameRoom(
  roomId: string,
  payload: RenameRoomRequest
): Promise<RoomDetail> {
  const { data } = await apiClient.patch<ApiRoom>(
    `/api/rooms/${roomId}`,
    payload
  );
  return normalizeRoom(data);
}

export async function deleteRoom(roomId: string): Promise<void> {
  await apiClient.delete(`/api/rooms/${roomId}`);
}

export async function joinRoomByShareId(
  shareId: string,
  payload: JoinRoomRequest
): Promise<JoinRoomResponse> {
  const { data } = await apiClient.post<ApiGuestJoinResponse>(
    `/api/rooms/join/${encodeURIComponent(shareId)}`,
    payload
  );
  const room = normalizeRoom(data.room);
  const accessToken = data.guestAccessToken || data.accessToken;
  if (!accessToken) {
    throw new Error("Guest join response missing access token");
  }
  return {
    accessToken,
    guest: {
      id: data.guest.id,
      displayName: data.guest.displayName,
      role: asRole(data.guest.role || room.role),
    },
    room: {
      ...room,
      role: asRole(data.guest.role || room.role),
      activeSessionId: data.sessionId || room.activeSessionId,
    },
  };
}

export async function saveRoomFile(
  roomId: string,
  persistenceFileId: string,
  payload: SaveFileRequest
): Promise<void> {
  await apiClient.post(
    `/api/rooms/${roomId}/files/${persistenceFileId}/save`,
    payload
  );
}

export async function fetchRoomFileContent(
  roomId: string,
  persistenceFileId: string
): Promise<string> {
  const { data } = await apiClient.get<FileContentResponse>(
    `/api/rooms/${roomId}/files/${persistenceFileId}/content`
  );
  return data.content ?? "";
}

export async function endRoom(roomId: string): Promise<void> {
  await apiClient.post(`/api/rooms/${roomId}/end`);
}

export function buildJoinShareLink(shareId: string): string {
  return `${window.location.origin}/join/${shareId}`;
}
