import React from "react";
import {
  VscFiles,
  VscSearch,
  VscAccount,
  VscSettingsGear,
} from "react-icons/vsc";
import { GrChatOption, GrShareOption } from "react-icons/gr";
import JoinSessionPanel from "./JoinSessionPanel";
import ChatPanel from "./ChatPanel";
import SearchPanel from "./SearchPanel";
import SessionParticipantsPanel from "./SessionParticipantsPanel";
import FileExplorerPanel from "./FileExplorerPanel";
import { RemoteUser, ChatMessageType } from "../types/props";
import { JoinStateType, SearchOptions, MatchInfo } from "../types/editor";
import { MockFile } from "../constants/mockFiles";
import { ICON_BAR_WIDTH, EXPLORER_HANDLE_WIDTH } from "../constants/layout";
import { COLORS } from "../constants/colors";

interface SidebarProps {
  sidebarContainerRef: React.RefObject<HTMLDivElement>;
  explorerPanelRef: React.RefObject<HTMLDivElement>;
  isExplorerCollapsed: boolean;
  explorerPanelSize: number;
  handleExplorerPanelMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  toggleExplorerPanel: () => void;
  openPanelWithIcon: (iconName: string) => void;
  activeIcon: string | null;
  setActiveIcon: React.Dispatch<React.SetStateAction<string | null>>;
  joinState: JoinStateType;
  sessionId: string | null;
  userName: string;
  userColor: string;
  isColorPickerOpen: boolean;
  handleNameChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleColorSelect: (color: string) => void;
  handleToggleColorPicker: () => void;
  handleConfirmJoin: () => void;
  isSessionActive: boolean;
  activeFileId: string | null;
  handleOpenFile: (fileId: string) => void;
  mockFiles: { [key: string]: MockFile };
  onSearchChange: (term: string, options: SearchOptions) => void;
  onReplaceChange: (value: string) => void;
  onToggleSearchOption: (optionKey: keyof SearchOptions) => void;
  replaceValue: string;
  searchOptions: SearchOptions;
  matchInfo: MatchInfo | null;
  onReplaceAll: () => void;
  handleShareIconClick: () => void;
  uniqueRemoteParticipants: RemoteUser[];
  localUserName: string;
  localUserColor: string;
  userId: string;
  chatMessages: ChatMessageType[];
  onSendMessage: (message: string) => void;
}

const Sidebar = ({
  sidebarContainerRef,
  explorerPanelRef,
  isExplorerCollapsed,
  explorerPanelSize,
  handleExplorerPanelMouseDown,
  openPanelWithIcon,
  activeIcon,
  setActiveIcon,
  joinState,
  sessionId,
  userName,
  userColor,
  isColorPickerOpen,
  handleNameChange,
  handleColorSelect,
  handleToggleColorPicker,
  handleConfirmJoin,
  isSessionActive,
  activeFileId,
  handleOpenFile,
  mockFiles,
  onSearchChange,
  onReplaceChange,
  onToggleSearchOption,
  replaceValue,
  searchOptions,
  matchInfo,
  onReplaceAll,
  handleShareIconClick,
  uniqueRemoteParticipants,
  localUserName,
  localUserColor,
  userId,
  chatMessages,
  onSendMessage,
}: SidebarProps) => {
  const handleGenericIconClick = (iconName: string) => {
    if (joinState === "prompting" && activeIcon === "share") {
      openPanelWithIcon(iconName);
      return;
    }

    if (isExplorerCollapsed) {
      openPanelWithIcon(iconName);
    } else {
      if (iconName === activeIcon) {
        setActiveIcon(null);
      } else {
        openPanelWithIcon(iconName);
      }
    }
  };

  const railBtn = (active: boolean) =>
    `ds-icon-rail-btn ${active ? "ds-icon-rail-btn-active" : ""}`;

  return (
    <div
      ref={sidebarContainerRef}
      className="flex flex-shrink-0 h-full relative"
    >
      <div
        className="bg-ink-850/90 flex flex-col justify-between py-2 border-r border-ink-500 flex-shrink-0 z-10"
        style={{ width: `${ICON_BAR_WIDTH}px` }}
      >
        <div className="flex flex-col items-center">
          <button
            type="button"
            className={railBtn(activeIcon === "files")}
            onClick={() => handleGenericIconClick("files")}
            title="Explorer"
          >
            <VscFiles size={22} />
          </button>
          <button
            type="button"
            className={railBtn(activeIcon === "search")}
            onClick={() => handleGenericIconClick("search")}
            title="Search"
          >
            <VscSearch size={22} />
          </button>
          <button
            type="button"
            className={railBtn(activeIcon === "share")}
            onClick={handleShareIconClick}
            title="Session"
          >
            <GrShareOption size={24} />
          </button>
          <button
            type="button"
            className={railBtn(activeIcon === "chat")}
            onClick={() => handleGenericIconClick("chat")}
            title="Chat"
          >
            <GrChatOption size={22} />
          </button>
        </div>
        <div className="flex flex-col items-center">
          <button
            type="button"
            className={railBtn(activeIcon === "account")}
            onClick={() => handleGenericIconClick("account")}
            title="Account"
          >
            <VscAccount size={22} />
          </button>
          <button
            type="button"
            className={railBtn(activeIcon === "settings")}
            onClick={() => handleGenericIconClick("settings")}
            title="Settings"
          >
            <VscSettingsGear size={22} />
          </button>
        </div>
      </div>

      <div
        ref={explorerPanelRef}
        className={`bg-ink-800/80 overflow-hidden flex flex-col h-full border-r border-ink-500 flex-shrink-0 ${
          !isExplorerCollapsed ? "visible" : "invisible w-0"
        }`}
        style={{ width: `${explorerPanelSize}px` }}
      >
        <>
          <div
            className={`flex-1 flex flex-col overflow-hidden ${
              (activeIcon === "files" || activeIcon === null) &&
              joinState !== "prompting"
                ? ""
                : "hidden"
            }`}
          >
            <FileExplorerPanel
              isSessionActive={isSessionActive}
              handleOpenFile={handleOpenFile}
              mockFiles={mockFiles}
              activeFileId={activeFileId}
            />
          </div>

          <div
            className={`flex-1 overflow-hidden ${
              activeIcon === "chat" ? "" : "hidden"
            }`}
          >
            <ChatPanel
              userName={userName}
              userColor={userColor}
              sessionId={sessionId}
              isSessionActive={isSessionActive}
              userId={userId}
              onSendMessage={onSendMessage}
              messages={chatMessages}
            />
          </div>

          <SearchPanel
            activeIcon={activeIcon}
            onExecuteSearch={onSearchChange}
            onExecuteReplaceAll={onReplaceAll}
            matchInfo={matchInfo}
            searchOptions={searchOptions}
            onToggleSearchOption={onToggleSearchOption}
            replaceValue={replaceValue}
            onReplaceChange={onReplaceChange}
          />

          {activeIcon === "share" && (
            <>
              {joinState === "prompting" ? (
                <JoinSessionPanel
                  userName={userName}
                  userColor={userColor}
                  isColorPickerOpen={isColorPickerOpen}
                  colors={COLORS}
                  onNameChange={handleNameChange}
                  onColorSelect={handleColorSelect}
                  onToggleColorPicker={handleToggleColorPicker}
                  onConfirmJoin={handleConfirmJoin}
                />
              ) : isSessionActive ? (
                <SessionParticipantsPanel
                  key={`${sessionId || "no-session"}-${
                    uniqueRemoteParticipants.length
                  }`}
                  activeIcon={activeIcon}
                  participants={uniqueRemoteParticipants}
                  localUser={{ name: localUserName, color: localUserColor }}
                />
              ) : (
                <div className="flex flex-col h-full">
                  <div className="ds-panel-title">Participants</div>
                  <div className="flex-1 overflow-y-auto px-4 py-8">
                    <p className="text-center text-mist-500 text-sm leading-relaxed">
                      Start or join a session to see who&apos;s in the
                      workspace.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          <div
            className={`p-4 text-mist-500 text-sm ${
              activeIcon === "account" ? "" : "hidden"
            }`}
          >
            Account settings coming soon.
          </div>

          <div
            className={`p-4 text-mist-500 text-sm ${
              activeIcon === "settings" ? "" : "hidden"
            }`}
          >
            Workspace settings coming soon.
          </div>
        </>
      </div>

      {!isExplorerCollapsed && (
        <div
          className="absolute top-0 h-full cursor-col-resize bg-transparent z-20 hover:bg-signal/20"
          style={{
            width: `${EXPLORER_HANDLE_WIDTH}px`,
            left: `${
              ICON_BAR_WIDTH + explorerPanelSize - EXPLORER_HANDLE_WIDTH / 2
            }px`,
            pointerEvents: "auto",
          }}
          onMouseDown={handleExplorerPanelMouseDown}
        />
      )}
    </div>
  );
};

export default Sidebar;
