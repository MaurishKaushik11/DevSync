import { motion, AnimatePresence } from "framer-motion";
import { JoinSessionPanelProps } from "../types/props";

const JoinSessionPanel = ({
  userName,
  userColor,
  isColorPickerOpen,
  colors,
  onNameChange,
  onColorSelect,
  onToggleColorPicker,
  onConfirmJoin,
}: JoinSessionPanelProps) => {
  return (
    <div className="flex flex-col h-full">
      <div className="ds-panel-title">Join session</div>

      <div className="flex-1 flex flex-col p-4 overflow-y-auto">
        <p className="text-xs text-mist-500 mb-4 leading-relaxed">
          You&apos;ve been invited to a live DevSync session. Set your name and
          join the workspace.
        </p>
        <div className="flex items-end gap-3 mb-4">
          <div className="relative flex-shrink-0">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-semibold cursor-pointer shadow-md ring-2 ring-ink-500"
              style={{ backgroundColor: userColor }}
              onClick={onToggleColorPicker}
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
                >
                  <div className="flex flex-wrap gap-1.5">
                    {colors.map((color) => (
                      <div
                        key={color}
                        className={`w-5 h-5 rounded-full cursor-pointer ${
                          userColor === color ? "ring-2 ring-signal" : ""
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => onColorSelect(color)}
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
              onChange={onNameChange}
              placeholder="Enter your name"
              className="ds-input"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={onConfirmJoin}
          disabled={!userName.trim()}
          className="ds-btn-primary mt-auto flex-shrink-0"
        >
          Join session
        </button>
      </div>
    </div>
  );
};

export default JoinSessionPanel;
