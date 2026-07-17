import { useState, useEffect } from "react";
import { JoinStateType } from "../types/editor";
import { COLORS } from "../constants/colors";
import { buildJoinShareLink } from "../services/roomService";

export interface SessionManagerHookProps {
  initialUserName?: string;
  initialUserColor?: string;
  /** OT session id from room.activeSessionId */
  initialSessionId?: string | null;
  shareId?: string | null;
  activeIcon: string | null;
  setActiveIcon: (icon: string | null) => void;
  explorerPanelSize: number;
  setExplorerPanelSize: (size: number) => void;
  /** When true, session is already established via room APIs */
  autoActivate?: boolean;
}

export interface SessionManagerHookResult {
  sessionId: string | null;
  setSessionId: React.Dispatch<React.SetStateAction<string | null>>;
  isSessionActive: boolean;
  setIsSessionActive: React.Dispatch<React.SetStateAction<boolean>>;
  joinState: JoinStateType;
  setJoinState: React.Dispatch<React.SetStateAction<JoinStateType>>;
  userName: string;
  setUserName: React.Dispatch<React.SetStateAction<string>>;
  userColor: string;
  setUserColor: React.Dispatch<React.SetStateAction<string>>;
  isColorPickerOpen: boolean;
  setIsColorPickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  shareMenuView: "initial" | "link";
  setShareMenuView: React.Dispatch<React.SetStateAction<"initial" | "link">>;
  generatedShareLink: string | null;
  setGeneratedShareLink: React.Dispatch<React.SetStateAction<string | null>>;
  hasShownInitialParticipants: boolean;
  setHasShownInitialParticipants: React.Dispatch<React.SetStateAction<boolean>>;
  handleStartSession: () => Promise<void>;
  handleCopyShareLink: () => void;
  handleConfirmJoin: () => void;
}

export const useSessionManager = ({
  initialUserName = "",
  initialUserColor = COLORS[0],
  initialSessionId = null,
  shareId = null,
  setActiveIcon,
  autoActivate = true,
}: SessionManagerHookProps): SessionManagerHookResult => {
  const [sessionId, setSessionId] = useState<string | null>(
    initialSessionId
  );
  const [isSessionActive, setIsSessionActive] = useState<boolean>(
    Boolean(autoActivate && initialSessionId)
  );
  const [joinState, setJoinState] = useState<JoinStateType>(
    autoActivate && initialSessionId ? "joined" : "idle"
  );

  const [userName, setUserName] = useState<string>(initialUserName);
  const [userColor, setUserColor] = useState<string>(initialUserColor);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [shareMenuView, setShareMenuView] = useState<"initial" | "link">(
    autoActivate && shareId ? "link" : "initial"
  );
  const [generatedShareLink, setGeneratedShareLink] = useState<string | null>(
    shareId ? buildJoinShareLink(shareId) : null
  );
  const [hasShownInitialParticipants, setHasShownInitialParticipants] =
    useState(false);

  // Sync when room props arrive / change
  useEffect(() => {
    if (initialSessionId) {
      setSessionId(initialSessionId);
      if (autoActivate) {
        setIsSessionActive(true);
        setJoinState("joined");
      }
    }
  }, [initialSessionId, autoActivate]);

  useEffect(() => {
    if (shareId) {
      const link = buildJoinShareLink(shareId);
      setGeneratedShareLink(link);
      setShareMenuView("link");
    }
  }, [shareId]);

  useEffect(() => {
    if (initialUserName) {
      setUserName(initialUserName);
    }
  }, [initialUserName]);

  const handleStartSession = async () => {
    // Room creation is handled on the dashboard / room bootstrap.
    // In workspace, share menu shows the existing invite link.
    if (!userName.trim()) return;
    setIsColorPickerOpen(false);

    if (sessionId && generatedShareLink) {
      setShareMenuView("link");
      setIsSessionActive(true);
      setJoinState("joined");
      return;
    }

    console.warn(
      "[useSessionManager] No active room session. Create a room from My Rooms."
    );
  };

  const handleCopyShareLink = () => {
    if (generatedShareLink) {
      navigator.clipboard.writeText(generatedShareLink).catch((err) => {
        console.error("Failed to copy link: ", err);
      });
    }
  };

  const handleConfirmJoin = () => {
    if (!userName.trim()) {
      alert("Please enter your name.");
      return;
    }
    setJoinState("joined");
    setIsSessionActive(true);
  };

  useEffect(() => {
    if (
      isSessionActive &&
      joinState === "joined" &&
      !hasShownInitialParticipants
    ) {
      setActiveIcon(null);
      setHasShownInitialParticipants(true);
    }
  }, [
    isSessionActive,
    joinState,
    hasShownInitialParticipants,
    setActiveIcon,
  ]);

  useEffect(() => {
    if (!isSessionActive) {
      setHasShownInitialParticipants(false);
    }
  }, [isSessionActive]);

  return {
    sessionId,
    setSessionId,
    isSessionActive,
    setIsSessionActive,
    joinState,
    setJoinState,
    userName,
    setUserName,
    userColor,
    setUserColor,
    isColorPickerOpen,
    setIsColorPickerOpen,
    shareMenuView,
    setShareMenuView,
    generatedShareLink,
    setGeneratedShareLink,
    hasShownInitialParticipants,
    setHasShownInitialParticipants,
    handleStartSession,
    handleCopyShareLink,
    handleConfirmJoin,
  };
};
