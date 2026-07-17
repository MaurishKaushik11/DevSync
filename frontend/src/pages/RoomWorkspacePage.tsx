import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { getRoom } from "../services/roomService";
import {
  selectIsAuthenticated,
  useAuthStore,
} from "../store/useAuthStore";
import { useFileStore } from "../store/useFileStore";
import type { RoomDetail } from "../types/room";
import { canEditRole } from "../types/room";
import Workspace from "../components/Workspace";
import { COLORS } from "../constants/colors";

interface LocationState {
  room?: RoomDetail;
  isGuest?: boolean;
}

export function RoomWorkspacePage() {
  const { roomId = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state || {}) as LocationState;

  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const user = useAuthStore((s) => s.user);
  const guest = useAuthStore((s) => s.guest);
  const hydrateFromRoomFiles = useFileStore((s) => s.hydrateFromRoomFiles);

  const [room, setRoom] = useState<RoomDetail | null>(state.room ?? null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!state.room);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      if (!roomId) {
        setError("Missing room id.");
        setLoading(false);
        return;
      }

      // Guest without token cannot open workspace
      if (!isAuthenticated && !guest?.accessToken) {
        // If we have shareId from guest clear, send to join — otherwise login
        navigate("/login", { replace: true });
        return;
      }

      if (state.room && state.room.id === roomId) {
        hydrateFromRoomFiles(state.room.files ?? []);
        setRoom(state.room);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const detail = await getRoom(roomId);
        if (cancelled) return;
        hydrateFromRoomFiles(detail.files ?? []);
        setRoom(detail);
      } catch {
        if (cancelled) return;
        setError("Unable to open this room.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once per roomId
  }, [roomId, isAuthenticated, guest?.accessToken]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-workspace text-mist-500 text-sm">
        Opening workspace…
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-workspace px-4 text-center gap-3">
        <p role="alert" className="text-sm text-red-400">
          {error || "Room not found."}
        </p>
        <Link to={isAuthenticated ? "/rooms" : "/login"} className="text-signal text-sm hover:underline">
          {isAuthenticated ? "Back to My Rooms" : "Sign in"}
        </Link>
      </div>
    );
  }

  if (!room.activeSessionId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-workspace px-4 text-center gap-3">
        <p className="font-display text-lg text-mist-100">No active session</p>
        <p className="text-sm text-mist-500 max-w-sm">
          This room does not have an active collaboration session yet.
        </p>
        <Link to="/rooms" className="text-signal text-sm hover:underline">
          Back to My Rooms
        </Link>
      </div>
    );
  }

  const isGuest = Boolean(guest && !isAuthenticated);
  const displayName = isGuest
    ? guest!.displayName
    : user?.displayName || user?.email || "Host";
  const userId = isGuest ? guest!.guestId : user?.id || "user";
  const role = room.role;
  const canEdit = canEditRole(role);

  return (
    <Workspace
      room={room}
      identity={{
        userId,
        displayName,
        color: COLORS[0],
        isGuest,
      }}
      role={role}
      canEdit={canEdit}
    />
  );
}
