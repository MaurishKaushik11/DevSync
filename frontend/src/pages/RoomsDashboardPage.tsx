import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  createRoom,
  deleteRoom,
  importRoom,
  listRooms,
  renameRoom,
} from "../services/roomService";
import { useAuthStore } from "../store/useAuthStore";
import type { RoomSummary } from "../types/room";
import { isPublicGitHubRepoUrl } from "../utils/roomImport";

function formatActivity(iso: string): string {
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function RoomsDashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [importRepoUrl, setImportRepoUrl] = useState("");
  const [importRoomName, setImportRoomName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const loadRooms = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listRooms();
      setRooms(data);
    } catch {
      setError("Could not load your rooms. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRooms();
  }, [loadRooms]);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    const name = newRoomName.trim() || "Untitled room";
    setCreating(true);
    setActionError(null);
    try {
      const room = await createRoom({ name });
      navigate(`/rooms/${room.id}`, { state: { room } });
    } catch {
      setActionError("Failed to create room.");
      setCreating(false);
    }
  };

  const handleImport = async (event: FormEvent) => {
    event.preventDefault();
    const repositoryUrl = importRepoUrl.trim();
    if (!isPublicGitHubRepoUrl(repositoryUrl)) {
      setActionError(
        "Enter a public GitHub repository URL (https://github.com/owner/repo)."
      );
      return;
    }
    setImporting(true);
    setActionError(null);
    try {
      const name = importRoomName.trim();
      const room = await importRoom({
        repositoryUrl,
        ...(name ? { name } : {}),
      });
      navigate(`/rooms/${room.id}`, { state: { room } });
    } catch {
      setActionError(
        "Failed to import repository. Check the URL is public and try again."
      );
      setImporting(false);
    }
  };

  const handleRename = async (roomId: string) => {
    const name = renameValue.trim();
    if (!name) return;
    setActionError(null);
    try {
      const updated = await renameRoom(roomId, { name });
      setRooms((prev) =>
        prev.map((r) => (r.id === roomId ? { ...r, name: updated.name } : r))
      );
      setRenamingId(null);
    } catch {
      setActionError("Failed to rename room.");
    }
  };

  const handleDelete = async (room: RoomSummary) => {
    const confirmed = window.confirm(
      `Delete “${room.name}”? This cannot be undone.`
    );
    if (!confirmed) return;
    setActionError(null);
    try {
      await deleteRoom(room.id);
      setRooms((prev) => prev.filter((r) => r.id !== room.id));
    } catch {
      setActionError("Failed to delete room.");
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-workspace text-mist-200 relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 40% at 10% 0%, rgba(46,230,166,0.08), transparent 50%)",
        }}
      />

      <header className="relative flex items-center justify-between border-b border-ink-500 bg-ink-850/90 px-5 h-14 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-signal/15 ring-1 ring-signal/30">
            <span className="font-display text-xs font-bold text-signal">
              DS
            </span>
          </div>
          <div>
            <p className="font-display text-sm font-bold text-mist-100 leading-none">
              DevSync
            </p>
            <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-mist-500">
              My Rooms
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-sm text-mist-400">
            {user?.displayName || user?.email}
          </span>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="text-sm text-mist-400 hover:text-mist-100 px-2 py-1 rounded-md hover:bg-ink-600"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="relative mx-auto max-w-4xl px-5 py-10">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-semibold text-mist-100">
            Instant interview & pair-programming rooms
          </h1>
          <p className="mt-2 text-sm text-mist-500 max-w-xl">
            Spin up a durable workspace, share a join link, and get to the first
            keystroke in seconds.
          </p>
        </div>

        <div className="mb-8 grid gap-4 lg:grid-cols-2">
          <form
            onSubmit={handleCreate}
            className="rounded-md border border-ink-500 bg-ink-850/70 p-4 flex flex-col gap-3"
          >
            <div>
              <h2 className="font-display text-sm font-semibold text-mist-100">
                Create room
              </h2>
              <p className="mt-1 text-xs text-mist-500">
                Start from a blank workspace with starter files.
              </p>
            </div>
            <label htmlFor="new-room-name" className="sr-only">
              Room name
            </label>
            <input
              id="new-room-name"
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="Room name (optional)"
              className="ds-input"
              disabled={creating || importing}
            />
            <button
              type="submit"
              disabled={creating || importing}
              className="ds-btn-primary w-full sm:w-auto sm:self-start sm:px-5 whitespace-nowrap"
            >
              {creating ? "Creating…" : "Create room"}
            </button>
          </form>

          <form
            onSubmit={(e) => void handleImport(e)}
            className="rounded-md border border-ink-500 bg-ink-850/70 p-4 flex flex-col gap-3"
            data-testid="import-repo-form"
          >
            <div>
              <h2 className="font-display text-sm font-semibold text-mist-100">
                Import GitHub repo
              </h2>
              <p className="mt-1 text-xs text-mist-500">
                Public repos only. Files over 25&nbsp;MB are skipped; files over
                1&nbsp;MB open read-only (no live collaboration).
              </p>
            </div>
            <label htmlFor="import-repo-url" className="sr-only">
              GitHub repository URL
            </label>
            <input
              id="import-repo-url"
              type="url"
              value={importRepoUrl}
              onChange={(e) => setImportRepoUrl(e.target.value)}
              placeholder="https://github.com/owner/repo"
              className="ds-input"
              required
              disabled={creating || importing}
              autoComplete="off"
            />
            <label htmlFor="import-room-name" className="sr-only">
              Room name
            </label>
            <input
              id="import-room-name"
              type="text"
              value={importRoomName}
              onChange={(e) => setImportRoomName(e.target.value)}
              placeholder="Room name (optional)"
              className="ds-input"
              disabled={creating || importing}
            />
            <button
              type="submit"
              disabled={creating || importing}
              className="ds-btn-primary w-full sm:w-auto sm:self-start sm:px-5 whitespace-nowrap"
            >
              {importing ? "Importing…" : "Import repository"}
            </button>
          </form>
        </div>

        {actionError && (
          <p role="alert" className="mb-4 text-sm text-red-400">
            {actionError}
          </p>
        )}

        {isLoading && (
          <p className="text-sm text-mist-500" aria-live="polite">
            Loading rooms…
          </p>
        )}

        {!isLoading && error && (
          <div className="rounded-md border border-ink-500 bg-ink-800 p-4">
            <p role="alert" className="text-sm text-red-400 mb-3">
              {error}
            </p>
            <button
              type="button"
              onClick={() => void loadRooms()}
              className="text-sm text-signal hover:underline"
            >
              Retry
            </button>
          </div>
        )}

        {!isLoading && !error && rooms.length === 0 && (
          <div className="rounded-md border border-dashed border-ink-400 bg-ink-850/60 px-6 py-12 text-center">
            <p className="font-display text-lg text-mist-100 mb-1">
              No rooms yet
            </p>
            <p className="text-sm text-mist-500">
              Create a room or import a public GitHub repo to get started.
            </p>
          </div>
        )}

        {!isLoading && !error && rooms.length > 0 && (
          <ul className="space-y-2" data-testid="rooms-list">
            {rooms.map((room) => (
              <li
                key={room.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-md border border-ink-500 bg-ink-850/80 px-4 py-3"
                data-testid="room-row"
              >
                <div className="flex-1 min-w-0">
                  {renamingId === room.id ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        className="ds-input"
                        aria-label="New room name"
                        autoFocus
                      />
                      <button
                        type="button"
                        className="text-sm text-signal px-2"
                        onClick={() => void handleRename(room.id)}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="text-sm text-mist-500 px-2"
                        onClick={() => setRenamingId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="font-medium text-mist-100 truncate">
                        {room.name}
                      </p>
                      <p className="text-xs text-mist-500 font-mono mt-0.5">
                        {room.role} · {formatActivity(room.lastActivityAt)}
                      </p>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link
                    to={`/rooms/${room.id}`}
                    className="rounded-md bg-signal px-3 py-1.5 text-sm font-semibold text-ink-950 hover:brightness-110"
                  >
                    Open
                  </Link>
                  <button
                    type="button"
                    className="text-sm text-mist-400 hover:text-mist-100 px-2 py-1"
                    onClick={() => {
                      setRenamingId(room.id);
                      setRenameValue(room.name);
                    }}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    className="text-sm text-red-400/90 hover:text-red-300 px-2 py-1"
                    onClick={() => void handleDelete(room)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
