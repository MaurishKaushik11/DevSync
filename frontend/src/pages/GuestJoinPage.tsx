import { FormEvent, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { joinRoomByShareId } from "../services/roomService";
import { useAuthStore } from "../store/useAuthStore";
import { useFileStore } from "../store/useFileStore";

export function GuestJoinPage() {
  const { shareId = "" } = useParams();
  const navigate = useNavigate();
  const setGuestSession = useAuthStore((s) => s.setGuestSession);
  const hydrateFromRoomFiles = useFileStore((s) => s.hydrateFromRoomFiles);

  const [displayName, setDisplayName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const name = displayName.trim();
    if (!name || !shareId) {
      setError("Display name is required.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await joinRoomByShareId(shareId, { displayName: name });
      setGuestSession({
        accessToken: result.accessToken,
        guestId: result.guest.id,
        displayName: result.guest.displayName,
        roomId: result.room.id,
        shareId: result.room.shareId,
      });
      hydrateFromRoomFiles(result.room.files ?? []);
      navigate(`/rooms/${result.room.id}`, {
        replace: true,
        state: { room: result.room, isGuest: true },
      });
    } catch {
      setError("Could not join this room. Check the invite link and try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-workspace px-4 relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 45% at 50% 0%, rgba(46,230,166,0.1), transparent 55%)",
        }}
      />
      <div className="relative w-full max-w-sm rounded-lg border border-ink-500 bg-ink-850/90 p-6 shadow-panel backdrop-blur-md">
        <div className="mb-5 text-center">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-signal/15 ring-1 ring-signal/30">
              <span className="font-display text-xs font-bold text-signal">
                DS
              </span>
            </div>
            <span className="font-display text-lg font-bold text-mist-100">
              DevSync
            </span>
          </div>
          <h1 className="font-display text-xl font-semibold text-mist-100">
            Join workspace
          </h1>
          <p className="mt-1.5 text-sm text-mist-500">
            Enter a display name to start editing — no account needed.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="guest-name"
              className="block text-[10px] font-mono uppercase tracking-wider text-mist-500 mb-1.5"
            >
              Display name
            </label>
            <input
              id="guest-name"
              name="displayName"
              type="text"
              autoFocus
              autoComplete="nickname"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="ds-input"
              placeholder="Your name"
              required
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="ds-btn-primary"
            disabled={isLoading || !displayName.trim()}
          >
            {isLoading ? "Joining…" : "Join room"}
          </button>
        </form>
      </div>
    </div>
  );
}
