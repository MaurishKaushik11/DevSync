import { useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FiCopy, FiPlay, FiUsers } from "react-icons/fi";
import { HeaderProps } from "../types/props";
import { COLORS } from "../constants/colors";

const Header = ({
  isViewMenuOpen,
  setIsViewMenuOpen,
  toggleWebView,
  toggleTerminalVisibility,
  isWebViewVisible,
  isTerminalCollapsed,
  handleRunCode,
  isShareMenuOpen,
  toggleShareMenu,
  shareMenuView,
  userName,
  userColor,
  handleNameChange,
  handleColorSelect,
  isColorPickerOpen,
  handleToggleColorPicker,
  handleStartSession,
  generatedShareLink,
  handleCopyShareLink,
  isSessionActive,
  uniqueRemoteParticipants,
  setIsColorPickerOpen,
}: HeaderProps) => {
  const headerRef = useRef<HTMLDivElement>(null);
  const viewMenuButtonRef = useRef<HTMLButtonElement>(null);
  const viewMenuRef = useRef<HTMLDivElement>(null);
  const shareButtonRef = useRef<HTMLButtonElement>(null);
  const shareMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isViewMenuOpen &&
        viewMenuRef.current &&
        !viewMenuRef.current.contains(event.target as Node) &&
        viewMenuButtonRef.current &&
        !viewMenuButtonRef.current.contains(event.target as Node)
      ) {
        setIsViewMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isViewMenuOpen, setIsViewMenuOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isShareMenuOpen &&
        shareMenuRef.current &&
        !shareMenuRef.current.contains(event.target as Node) &&
        shareButtonRef.current &&
        !shareButtonRef.current.contains(event.target as Node)
      ) {
        toggleShareMenu();
        setIsColorPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [
    isShareMenuOpen,
    isColorPickerOpen,
    toggleShareMenu,
    setIsColorPickerOpen,
  ]);

  return (
    <div
      ref={headerRef}
      className="flex items-stretch justify-between bg-ink-850/95 border-b border-ink-500 flex-shrink-0 relative h-12 backdrop-blur-md"
    >
      <div className="flex items-stretch">
        <div className="flex items-center gap-2.5 px-4 border-r border-ink-500 mr-1">
          <div className="relative flex h-7 w-7 items-center justify-center rounded-md bg-signal/15 ring-1 ring-signal/30">
            <span className="font-display text-[13px] font-800 font-bold text-signal leading-none">
              DS
            </span>
            <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-signal shadow-glow animate-pulse-soft" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-display text-sm font-bold tracking-tight text-mist-100">
              DevSync
            </span>
            <span className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-mist-500">
              Live workspace
            </span>
          </div>
        </div>

        <div className="flex h-full">
          <button className="ds-btn h-full flex items-center px-3" type="button">
            File
          </button>
          <button className="ds-btn h-full flex items-center px-3" type="button">
            Edit
          </button>
          <button
            type="button"
            className={`h-full flex items-center px-3 text-sm relative ${
              isViewMenuOpen ? "ds-btn-active" : "ds-btn"
            }`}
            onClick={() => setIsViewMenuOpen((prev) => !prev)}
            ref={viewMenuButtonRef}
          >
            View
          </button>
          <button
            type="button"
            className="h-full flex items-center gap-1.5 px-3 text-sm text-mist-300 hover:text-signal hover:bg-signal/10 transition-colors"
            onClick={handleRunCode}
          >
            <FiPlay size={13} />
            Run
          </button>
        </div>

        {isViewMenuOpen && (
          <div
            ref={viewMenuRef}
            className="absolute ds-menu z-50 whitespace-nowrap animate-fade-in min-w-[180px]"
            style={{
              left: `${viewMenuButtonRef.current?.offsetLeft ?? 0}px`,
              top: `${headerRef.current?.offsetHeight ?? 0}px`,
            }}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleWebView();
              }}
              className="block w-full text-left px-3 py-2 text-sm text-mist-200 hover:bg-ink-600 hover:text-mist-100"
            >
              {isWebViewVisible ? "Hide live preview" : "Show live preview"}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleTerminalVisibility();
              }}
              className="block w-full text-left px-3 py-2 text-sm text-mist-200 hover:bg-ink-600 hover:text-mist-100"
            >
              {!isTerminalCollapsed ? "Hide terminal" : "Show terminal"}
            </button>
          </div>
        )}
      </div>

      <div className="flex items-stretch gap-1 pr-2">
        {isSessionActive && (
          <div className="flex items-center gap-2 px-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-signal/10 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-signal ring-1 ring-signal/25">
              <span className="h-1.5 w-1.5 rounded-full bg-signal animate-pulse-soft" />
              Live
            </span>
            {uniqueRemoteParticipants.length > 0 && (
              <div className="flex items-center -space-x-2">
                {uniqueRemoteParticipants.map((user) => (
                  <div
                    key={user.id}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ring-2 ring-ink-850 cursor-default shadow-sm"
                    style={{ backgroundColor: user.color }}
                    title={user.name}
                  >
                    <span className="text-white/95 select-none">
                      {user.name ? user.name[0].toUpperCase() : "?"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="relative flex h-full items-center">
          <button
            ref={shareButtonRef}
            type="button"
            onClick={toggleShareMenu}
            className={`h-8 flex items-center gap-1.5 px-3.5 text-sm rounded-md transition-all ${
              isShareMenuOpen || isSessionActive
                ? "bg-signal text-ink-950 font-semibold shadow-glow"
                : "bg-ink-600 text-mist-100 hover:bg-ink-500 ring-1 ring-ink-400"
            }`}
          >
            <FiUsers size={14} />
            {isSessionActive ? "Invite" : "Share"}
          </button>
          <AnimatePresence>
            {isShareMenuOpen && (
              <motion.div
                ref={shareMenuRef}
                className="absolute right-0 w-72 ds-menu z-50 p-4"
                style={{
                  top: `${(headerRef.current?.offsetHeight ?? 0) + 4}px`,
                }}
                onClick={(e) => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.96, y: -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -6 }}
                transition={{ duration: 0.12 }}
              >
                {shareMenuView === "initial" && (
                  <>
                    <p className="font-display text-sm font-semibold text-mist-100 mb-1">
                      Start collaborating
                    </p>
                    <p className="text-xs text-mist-500 mb-4">
                      Create a live session and invite others to edit with you.
                    </p>
                    <div className="flex items-end gap-3 mb-4">
                      <div className="relative flex-shrink-0">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-semibold cursor-pointer shadow-md ring-2 ring-ink-500"
                          style={{ backgroundColor: userColor }}
                          onClick={handleToggleColorPicker}
                        >
                          <span className="text-white/95">
                            {userName ? userName[0].toUpperCase() : ""}
                          </span>
                        </div>
                        <AnimatePresence>
                          {isColorPickerOpen && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9, y: -5 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.9, y: -5 }}
                              transition={{ duration: 0.1 }}
                              className="absolute left-0 top-full mt-2 bg-ink-900/95 backdrop-blur-sm p-2.5 border border-ink-500 rounded-md shadow-panel z-10 w-[120px]"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex flex-wrap gap-1.5">
                                {COLORS.map((color) => (
                                  <div
                                    key={color}
                                    className={`w-5 h-5 rounded-full cursor-pointer ${
                                      userColor === color
                                        ? "ring-2 ring-signal"
                                        : ""
                                    }`}
                                    style={{ backgroundColor: color }}
                                    onClick={() => handleColorSelect(color)}
                                  />
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      <div className="flex-1">
                        <label className="block text-[10px] font-mono uppercase tracking-wider text-mist-500 mb-1.5">
                          Display name
                        </label>
                        <input
                          type="text"
                          value={userName}
                          onChange={handleNameChange}
                          placeholder="Enter your name"
                          className="ds-input"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleStartSession}
                      disabled={!userName.trim()}
                      className="ds-btn-primary"
                    >
                      Start session
                    </button>
                  </>
                )}

                {shareMenuView === "link" && generatedShareLink && (
                  <div className="flex flex-col">
                    <p className="font-display text-sm font-semibold text-mist-100 mb-1">
                      Session ready
                    </p>
                    <p className="text-xs text-mist-500 mb-3">
                      Share this link — collaborators join instantly.
                    </p>
                    <div className="flex items-stretch gap-0 bg-ink-900 border border-ink-500 rounded-md overflow-hidden">
                      <input
                        type="text"
                        readOnly
                        value={generatedShareLink}
                        className="flex-1 bg-transparent text-mist-300 text-xs outline-none select-all px-2.5 py-2 font-mono"
                        onFocus={(e) => e.target.select()}
                      />
                      <button
                        type="button"
                        onClick={handleCopyShareLink}
                        className="px-2.5 flex items-center justify-center text-signal hover:bg-signal/10 transition-colors flex-shrink-0 border-l border-ink-500"
                        aria-label="Copy link"
                      >
                        <FiCopy size={15} />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={toggleShareMenu}
                      className="mt-3 ds-btn-primary"
                    >
                      Done
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Header;
