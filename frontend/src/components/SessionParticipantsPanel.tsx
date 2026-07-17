import { SessionParticipantsPanelProps } from "../types/props";

const SessionParticipantsPanel = ({
  participants,
  localUser,
  activeIcon,
}: SessionParticipantsPanelProps) => {
  if (activeIcon !== "share") {
    return null;
  }

  return (
    <div className="flex flex-col flex-1 text-sm text-mist-200">
      <div className="ds-panel-title">Participants</div>
      <ul
        className={`overflow-y-auto divide-y divide-ink-600 ${
          participants.length > 0 ? "border-b border-ink-600" : ""
        }`}
      >
        <li key="local-user" className="flex items-center pl-4 pr-2 py-2.5">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ring-2 ring-signal/40 shadow-sm mr-2 flex-shrink-0"
            style={{ backgroundColor: localUser.color }}
            title={`You: ${localUser.name}`}
          >
            <span className="text-white/95 select-none">
              {localUser.name ? localUser.name[0].toUpperCase() : "?"}
            </span>
          </div>
          <span className="truncate text-mist-100">
            {localUser.name}{" "}
            <span className="text-signal text-xs font-mono">(you)</span>
          </span>
        </li>

        {participants.map((user) => (
          <li key={user.id} className="flex items-center pl-4 pr-2 py-2.5">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ring-1 ring-ink-500 shadow-sm mr-2 flex-shrink-0"
              style={{ backgroundColor: user.color }}
              title={user.name}
            >
              <span className="text-white/95 select-none">
                {user.name ? user.name[0].toUpperCase() : "?"}
              </span>
            </div>
            <span className="truncate">{user.name}</span>
          </li>
        ))}
        {participants.length === 0 && (
          <li className="pl-4 pr-2 py-3 text-mist-500 text-xs">
            Waiting for collaborators to join…
          </li>
        )}
      </ul>
    </div>
  );
};

export default SessionParticipantsPanel;
