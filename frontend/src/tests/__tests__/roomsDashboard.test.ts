import { canEditRole } from "../../types/room";
import type { RoomSummary } from "../../types/room";
import {
  effectiveCanEdit,
  formatFileSize,
  isPublicGitHubRepoUrl,
} from "../../utils/roomImport";
import { normalizeRoomFile } from "../../services/roomService";

/** Pure helper mirroring dashboard: preserve backend order (already sorted). */
function roomsInBackendOrder(rooms: RoomSummary[]): RoomSummary[] {
  return [...rooms];
}

describe("Rooms dashboard helpers", () => {
  const rooms: RoomSummary[] = [
    {
      id: "1",
      shareId: "a",
      name: "Newest",
      role: "HOST",
      activeSessionId: "s1",
      lastActivityAt: "2026-07-17T12:00:00Z",
    },
    {
      id: "2",
      shareId: "b",
      name: "Older",
      role: "EDITOR",
      activeSessionId: "s2",
      lastActivityAt: "2026-07-16T12:00:00Z",
    },
  ];

  it("preserves backend sort order for rendering", () => {
    const ordered = roomsInBackendOrder(rooms);
    expect(ordered.map((r) => r.name)).toEqual(["Newest", "Older"]);
  });

  it("exposes actions for host rooms (open/rename/delete conceptually)", () => {
    const hostRoom = rooms[0];
    expect(hostRoom.role).toBe("HOST");
    expect(canEditRole(hostRoom.role)).toBe(true);
  });
});

describe("viewer read-only policy", () => {
  it("VIEWER cannot edit or save", () => {
    const role = "VIEWER" as const;
    const canEdit = canEditRole(role);
    expect(canEdit).toBe(false);
  });
});

describe("GitHub import URL validation", () => {
  it("accepts public github.com owner/repo URLs", () => {
    expect(isPublicGitHubRepoUrl("https://github.com/acme/widget")).toBe(true);
    expect(
      isPublicGitHubRepoUrl("https://github.com/acme/widget.git")
    ).toBe(true);
    expect(
      isPublicGitHubRepoUrl("https://www.github.com/acme/widget/")
    ).toBe(true);
  });

  it("rejects non-GitHub or incomplete URLs", () => {
    expect(isPublicGitHubRepoUrl("")).toBe(false);
    expect(isPublicGitHubRepoUrl("https://gitlab.com/acme/widget")).toBe(
      false
    );
    expect(isPublicGitHubRepoUrl("https://github.com/acme")).toBe(false);
    expect(isPublicGitHubRepoUrl("not-a-url")).toBe(false);
  });
});

describe("normalizeRoomFile", () => {
  it("maps name to OT id/path and UUID to persistenceId", () => {
    const file = normalizeRoomFile({
      id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      name: "src/main.ts",
      language: "typescript",
      content: "export {}",
      sizeBytes: 10,
      collaborationEnabled: true,
    });
    expect(file.id).toBe("src/main.ts");
    expect(file.path).toBe("src/main.ts");
    expect(file.persistenceId).toBe("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
    expect(file.content).toBe("export {}");
    expect(file.sizeBytes).toBe(10);
    expect(file.collaborationEnabled).toBe(true);
  });

  it("preserves null content and collaborationEnabled=false for large files", () => {
    const file = normalizeRoomFile({
      id: "11111111-1111-1111-1111-111111111111",
      name: "big.bin.txt",
      language: "plaintext",
      content: null,
      sizeBytes: 2_500_000,
      collaborationEnabled: false,
    });
    expect(file.content).toBeNull();
    expect(file.sizeBytes).toBe(2_500_000);
    expect(file.collaborationEnabled).toBe(false);
  });

  it("defaults collaborationEnabled to true when omitted", () => {
    const file = normalizeRoomFile({
      id: "22222222-2222-2222-2222-222222222222",
      name: "index.html",
      content: "<html></html>",
    });
    expect(file.collaborationEnabled).toBe(true);
  });
});

describe("per-file edit flags", () => {
  it("requires writable role and collaborationEnabled", () => {
    expect(effectiveCanEdit(true, true)).toBe(true);
    expect(effectiveCanEdit(true, false)).toBe(false);
    expect(effectiveCanEdit(false, true)).toBe(false);
    expect(effectiveCanEdit(true, undefined)).toBe(true);
  });

  it("formats file sizes for the read-only banner", () => {
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(2048)).toBe("2.0 KB");
    expect(formatFileSize(1_500_000)).toMatch(/MB/);
  });
});
