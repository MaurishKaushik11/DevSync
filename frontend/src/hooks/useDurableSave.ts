import { useCallback, useEffect, useRef, useState } from "react";
import { saveRoomFile } from "../services/roomService";
import { selectEffectiveAccessToken, useAuthStore } from "../store/useAuthStore";
import { useFileStore } from "../store/useFileStore";
import { getBackendUrl } from "../services/apiClient";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface UseDurableSaveOptions {
  roomId: string | null;
  canEdit: boolean;
  enabled?: boolean;
}

export function useDurableSave({
  roomId,
  canEdit,
  enabled = true,
}: UseDurableSaveOptions) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const saveStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeFileId = useFileStore((s) => s.activeFileId);

  const clearStatusLater = useCallback(() => {
    if (saveStatusTimerRef.current) {
      clearTimeout(saveStatusTimerRef.current);
    }
    saveStatusTimerRef.current = setTimeout(() => {
      setSaveStatus("idle");
    }, 2000);
  }, []);

  const saveActiveFile = useCallback(async () => {
    if (!enabled || !canEdit || !roomId || !activeFileId) return;

    const store = useFileStore.getState();
    const content = store.fileContents[activeFileId];
    const persistenceId = store.getPersistenceId(activeFileId);
    if (content == null || !persistenceId) return;

    setSaveStatus("saving");
    try {
      await saveRoomFile(roomId, persistenceId, { content });
      setSaveStatus("saved");
      clearStatusLater();
    } catch {
      setSaveStatus("error");
      clearStatusLater();
    }
  }, [enabled, canEdit, roomId, activeFileId, clearStatusLater]);

  const bestEffortSave = useCallback(() => {
    if (!enabled || !canEdit || !roomId || !activeFileId) return;

    const store = useFileStore.getState();
    const content = store.fileContents[activeFileId];
    const persistenceId = store.getPersistenceId(activeFileId);
    const token = selectEffectiveAccessToken(useAuthStore.getState());
    if (content == null || !persistenceId || !token) return;

    const url = `${getBackendUrl()}/api/rooms/${roomId}/files/${persistenceId}/save`;
    try {
      void fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
        credentials: "include",
        keepalive: true,
      });
    } catch {
      // best-effort; ignore
    }
  }, [enabled, canEdit, roomId, activeFileId]);

  useEffect(() => {
    if (!enabled || !canEdit) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const isSave =
        (event.metaKey || event.ctrlKey) &&
        (event.key === "s" || event.key === "S");
      if (!isSave) return;
      event.preventDefault();
      void saveActiveFile();
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [enabled, canEdit, saveActiveFile]);

  useEffect(() => {
    if (!enabled || !canEdit) return;

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        bestEffortSave();
      }
    };
    const onUnload = () => {
      bestEffortSave();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onUnload);
    };
  }, [enabled, canEdit, bestEffortSave]);

  useEffect(() => {
    return () => {
      if (saveStatusTimerRef.current) {
        clearTimeout(saveStatusTimerRef.current);
      }
    };
  }, []);

  return { saveStatus, saveActiveFile };
}
