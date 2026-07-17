import React, { useState, useEffect, useRef } from "react";
import ChatMessageComponent from "./ChatMessage";
import { IoSend } from "react-icons/io5";
import { ChatPanelProps } from "../types/chat";

const ChatPanel = ({
  isSessionActive,
  onSendMessage,
  messages,
}: ChatPanelProps) => {
  const [inputMessage, setInputMessage] = useState("");
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);

    const textarea = e.target;
    if (textarea.scrollHeight > 36 && textarea.scrollHeight <= 150) {
      textarea.style.height = `${textarea.scrollHeight}px`;
    } else if (textarea.scrollHeight <= 36) {
      textarea.style.height = "36px";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputMessage.trim() || !isSessionActive) return;

    onSendMessage(inputMessage.trim());
    setInputMessage("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "36px";
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="ds-panel-title">Chat</div>

      <div className="flex-1 overflow-y-auto overscroll-y-none">
        {messages.length > 0 ? (
          <>
            {messages.map((msg, index) => (
              <ChatMessageComponent
                key={`${msg.userId}-${index}`}
                userName={msg.userName}
                message={msg.message}
                userColor={msg.userColor}
                timestamp={msg.formattedTimestamp || msg.timestamp}
                isFirstMessage={index === 0}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        ) : (
          <div className="text-center py-10 text-mist-500 text-sm px-4">
            {isSessionActive
              ? "No messages yet — say hello."
              : "Join a session to start chatting."}
          </div>
        )}
      </div>

      <div className="p-3 flex-shrink-0 border-t border-ink-600">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <textarea
            ref={textareaRef}
            value={inputMessage}
            onChange={handleInputChange}
            placeholder={
              isSessionActive ? "Type a message..." : "Join a session to chat"
            }
            disabled={!isSessionActive}
            style={{ height: "36px" }}
            className={`w-full ds-input pr-10 resize-none overflow-y-auto box-border leading-4 ${
              !isSessionActive ? "opacity-50 cursor-not-allowed" : ""
            }`}
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || !isSessionActive}
            className={`absolute right-0 h-8 flex items-center justify-center px-3 ${
              inputMessage.trim() && isSessionActive
                ? "text-signal hover:text-mist-100"
                : "text-ink-400 cursor-not-allowed"
            }`}
          >
            <IoSend />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatPanel;
