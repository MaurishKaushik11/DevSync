import React from "react";
import { editor } from "monaco-editor";
import { VscFile } from "react-icons/vsc";

import {
  JoinStateType,
  EditorLanguageKey,
  TerminalHandle,
} from "../types/editor";
import { RemoteUser } from "../types/props";
import CodeEditor from "./CodeEditor";
import TerminalComponent from "./TerminalComponent";
import WebViewPanel from "./WebViewPanel";
import FileTabs from "./FileTabs";
import {
  editorLanguageMap,
  languageIconMap,
  languageColorMap,
  defaultIconColor,
} from "../constants/mappings";
import {
  TERMINAL_HANDLE_HEIGHT,
  WEBVIEW_HANDLE_GRAB_WIDTH,
} from "../constants/layout";
import { useFileStore } from "../store/useFileStore";
import { formatFileSize } from "../utils/roomImport";

interface MainEditorAreaProps {
  // Refs
  editorTerminalAreaRef: React.RefObject<HTMLDivElement>;
  tabContainerRef: React.RefObject<HTMLDivElement>;
  terminalRef: React.RefObject<TerminalHandle>;
  editorInstanceRef: React.MutableRefObject<editor.IStandaloneCodeEditor | null>;

  // Editor
  fileContents: { [id: string]: string | null };
  handleCodeChange: (newCode: string) => void;
  handleEditorDidMount: (editorInstance: editor.IStandaloneCodeEditor) => void;
  currentRemoteUsers: RemoteUser[];
  localUserId: string;

  // Tab operations
  handleSwitchTab: (fileId: string) => void;
  handleCloseTab: (fileId: string) => void;

  // Terminal Resizing
  terminalPanelHeight: number;
  isTerminalCollapsed: boolean;
  handleTerminalPanelMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;

  // WebView Resizing & Content
  webViewPanelWidth: number;
  handleWebViewPanelMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  htmlFileContent: string;
  cssFileContent: string;
  jsFileContent: string;
  toggleWebView: () => void;
  isSessionActive: boolean;
  joinState: JoinStateType;
  tabsHaveOverflow: boolean;
  onTabsOverflowChange: (hasOverflow: boolean) => void;
  readOnly?: boolean;
  contentLoading?: boolean;
  contentLoadError?: string | null;
  isLargeFileReadOnly?: boolean;
  activeFileSizeBytes?: number;
}

type IconPropsForMappings = {
  size?: number;
  className?: string;
};

const MainEditorArea = ({
  editorTerminalAreaRef,
  tabContainerRef,
  terminalRef,
  fileContents,
  handleCodeChange,
  handleEditorDidMount,
  currentRemoteUsers,
  localUserId,
  handleSwitchTab,
  handleCloseTab,
  terminalPanelHeight,
  isTerminalCollapsed,
  handleTerminalPanelMouseDown,
  webViewPanelWidth,
  handleWebViewPanelMouseDown,
  htmlFileContent,
  cssFileContent,
  jsFileContent,
  toggleWebView,
  isSessionActive,
  joinState,
  tabsHaveOverflow,
  onTabsOverflowChange,
  readOnly = false,
  contentLoading = false,
  contentLoadError = null,
  isLargeFileReadOnly = false,
  activeFileSizeBytes = 0,
}: MainEditorAreaProps) => {
  const { openFiles, activeFileId } = useFileStore();

  // Find the active file object
  const activeFile = openFiles.find((f) => f.id === activeFileId);

  let ActiveIconComponent: React.ComponentType<IconPropsForMappings> = VscFile;
  let activeIconColor = defaultIconColor;

  if (activeFile) {
    ActiveIconComponent =
      languageIconMap[activeFile.language as EditorLanguageKey] || VscFile;
    activeIconColor =
      languageColorMap[activeFile.language as EditorLanguageKey] ||
      defaultIconColor;
  }

  const activeContent =
    activeFileId != null ? fileContents[activeFileId] : undefined;

  return (
    <div className={`flex flex-1 min-w-0 relative`}>
      <div
        ref={editorTerminalAreaRef}
        className="flex-1 flex flex-col relative overflow-x-hidden min-w-0"
      >
        {/* Tabs */}
        <FileTabs
          tabContainerRef={tabContainerRef}
          onOverflowChange={onTabsOverflowChange}
          onSwitchTab={handleSwitchTab}
          onCloseTab={handleCloseTab}
        />

        {/* Breadcrumbs Area */}
        <div className="h-7 flex-shrink-0 bg-ink-900 flex items-center px-3 text-sm text-mist-400 overflow-hidden whitespace-nowrap border-b border-ink-600/60 gap-2">
          {activeFile ? (
            <React.Fragment>
              <ActiveIconComponent
                size={14}
                className={`mr-1.5 flex-shrink-0 ${activeIconColor}`}
              />
              <span className="font-mono text-xs text-mist-400">
                {activeFile.name}
              </span>
              {isLargeFileReadOnly && (
                <span
                  className="ml-auto flex-shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-amber-200/90 bg-amber-500/10 ring-1 ring-amber-500/25"
                  title="Files over 1 MB are opened read-only without live collaboration"
                >
                  Large file · read-only
                  {activeFileSizeBytes > 0
                    ? ` · ${formatFileSize(activeFileSizeBytes)}`
                    : ""}
                </span>
              )}
            </React.Fragment>
          ) : (
            <span />
          )}
        </div>

        {/* Code Editor Area */}
        <div className="flex-1 overflow-auto font-mono text-sm relative bg-ink-900 min-h-0">
          {joinState === "prompting" ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 px-6 text-center">
              <p className="font-display text-lg font-semibold text-mist-100">
                Almost there
              </p>
              <p className="text-sm text-mist-500 max-w-sm">
                Enter your details in the sidebar to join this live session.
              </p>
            </div>
          ) : contentLoadError ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 px-6 text-center">
              <p role="alert" className="text-sm text-red-400">
                {contentLoadError}
              </p>
              <p className="text-xs text-mist-500">
                Switch tabs or reopen the file to retry.
              </p>
            </div>
          ) : contentLoading || (activeFileId && activeContent == null) ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 px-6 text-center">
              <p className="text-sm text-mist-400" aria-live="polite">
                Loading file…
              </p>
            </div>
          ) : activeFileId && openFiles.find((f) => f.id === activeFileId) ? (
            <CodeEditor
              theme="devSyncTheme"
              language={
                editorLanguageMap[
                  openFiles.find((f) => f.id === activeFileId)?.language ||
                    "plaintext"
                ]
              }
              showLineNumbers={true}
              code={activeContent ?? ""}
              onCodeChange={handleCodeChange}
              onEditorDidMount={handleEditorDidMount}
              users={currentRemoteUsers}
              localUserId={localUserId}
              isSessionActive={isSessionActive}
              readOnly={readOnly}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-2 px-6 text-center">
              <p className="font-display text-lg font-semibold text-mist-100">
                Open a file
              </p>
              <p className="text-sm text-mist-500">
                Select a file from the explorer to start editing.
              </p>
            </div>
          )}
        </div>

        {/* Terminal Resizer */}
        <div
          className={`w-full bg-ink-600 flex-shrink-0 ${
            isTerminalCollapsed
              ? "cursor-pointer hover:bg-signal/40"
              : "cursor-row-resize hover:bg-signal/50 active:bg-signal/60"
          }`}
          style={{ height: `${TERMINAL_HANDLE_HEIGHT}px` }}
          onMouseDown={handleTerminalPanelMouseDown}
        />

        {/* Terminal Panel */}
        <div
          className={`bg-ink-900/95 flex flex-col border-t border-ink-500 flex-shrink-0 ${
            isTerminalCollapsed ? "hidden" : "flex"
          }`}
          style={{ height: `${terminalPanelHeight}px` }}
        >
          <div className="flex bg-ink-850 py-1 text-sm flex-shrink-0 border-b border-ink-600/60">
            <div className="px-4 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-mist-400">
              Terminal
            </div>
          </div>
          <div className="flex-1 px-4 pt-2 font-mono text-sm overflow-hidden min-h-0">
            <TerminalComponent ref={terminalRef} height={terminalPanelHeight} />
          </div>
        </div>
      </div>

      {/* Invisible WebView Resizer Handle */}
      {webViewPanelWidth > 0 && (
        <div
          className="absolute cursor-col-resize bg-transparent z-20"
          style={{
            width: `${WEBVIEW_HANDLE_GRAB_WIDTH}px`,
            left: `calc(100% - ${webViewPanelWidth}px - ${
              WEBVIEW_HANDLE_GRAB_WIDTH / 2
            }px)`,
            top: tabsHaveOverflow ? "0px" : "33px",
            height: `calc(100% - ${tabsHaveOverflow ? "0px" : "33px"}`,
          }}
          onMouseDown={handleWebViewPanelMouseDown}
        />
      )}

      {/* WebView Panel */}
      {webViewPanelWidth > 0 && (
        <div
          className={`flex-shrink-0 overflow-hidden bg-ink-800 relative 
                     before:content-[''] before:absolute before:left-0 before:bottom-0 before:w-px before:bg-ink-500
                     ${
                       tabsHaveOverflow ? "before:top-0" : "before:top-[33px]"
                     }`}
          style={{ width: `${webViewPanelWidth}px` }}
        >
          <WebViewPanel
            htmlContent={htmlFileContent}
            cssContent={cssFileContent}
            jsContent={jsFileContent}
            onClose={toggleWebView}
          />
        </div>
      )}
    </div>
  );
};

export default MainEditorArea;
