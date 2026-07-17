import React from "react";
import { ChatMessageProps } from "../types/chat";

const ChatMessage: React.FC<ChatMessageProps> = ({
  userName,
  message,
  userColor,
  timestamp,
}) => {
  const firstLetter = userName ? userName[0].toUpperCase() : "?";

  return (
    <div className="py-3 border-b border-ink-600 hover:bg-ink-700/40 transition-colors">
      <div className="pl-4 pr-2">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center">
            <div
              className="flex-shrink-0 w-6 h-6 rounded-full mr-2 flex items-center justify-center text-xs font-semibold shadow-sm ring-1 ring-ink-500"
              style={{ backgroundColor: userColor }}
            >
              <span className="text-white/95 select-none">{firstLetter}</span>
            </div>

            <span className="font-medium text-xs text-mist-200">{userName}</span>
          </div>

          {timestamp && (
            <span className="text-[10px] font-mono text-mist-500">
              {timestamp}
            </span>
          )}
        </div>

        <p className="text-sm text-mist-400 break-words pl-8">{message}</p>
      </div>
    </div>
  );
};

export default ChatMessage;
