import { ConnectionStatus, StatusBarProps } from "../types/props";

const StatusBar = ({
  connectionStatus,
  language = "plaintext",
  line = 1,
  column = 1,
}: StatusBarProps) => {
  const getStatusIndicator = (status: ConnectionStatus) => {
    switch (status) {
      case "connected":
        return (
          <span
            className="w-1.5 h-1.5 bg-signal rounded-full inline-block mr-1.5 shadow-glow"
            title="Connected"
          />
        );
      case "disconnected":
        return (
          <span
            className="w-1.5 h-1.5 bg-red-400 rounded-full inline-block mr-1.5"
            title="Disconnected"
          />
        );
      case "connecting":
        return (
          <span
            className="w-1.5 h-1.5 bg-amber-400 rounded-full inline-block mr-1.5 animate-pulse-soft"
            title="Connecting..."
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-ink-850/95 text-mist-500 flex justify-between items-stretch h-7 text-[11px] font-mono border-t border-ink-500 flex-shrink-0">
      <div className="flex items-stretch">
        {connectionStatus && (
          <div className="flex items-center px-3 cursor-default select-none hover:bg-ink-600 hover:text-mist-200 transition-colors">
            {getStatusIndicator(connectionStatus)}
            {connectionStatus.charAt(0).toUpperCase() +
              connectionStatus.slice(1)}
          </div>
        )}
        <div className="flex items-center px-3 cursor-default select-none hover:bg-ink-600 hover:text-mist-200 transition-colors">
          {language}
        </div>
        <div className="flex items-center px-3 cursor-default select-none hover:bg-ink-600 hover:text-mist-200 transition-colors">
          UTF-8
        </div>
      </div>
      <div className="flex items-stretch">
        <div className="flex items-center px-3 cursor-default select-none hover:bg-ink-600 hover:text-mist-200 transition-colors">
          Ln {line}, Col {column}
        </div>
        <div className="flex items-center px-3 cursor-default select-none hover:bg-ink-600 hover:text-mist-200 transition-colors">
          Spaces: 2
        </div>
        <div className="flex items-center px-3 cursor-default select-none text-signal/80 hover:bg-signal/10 hover:text-signal transition-colors">
          DevSync
        </div>
      </div>
    </div>
  );
};

export default StatusBar;
