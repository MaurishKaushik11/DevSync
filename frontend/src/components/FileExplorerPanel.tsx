import { useState } from "react";
import { VscFile, VscChevronDown, VscChevronRight } from "react-icons/vsc";
import {
  languageIconMap,
  languageColorMap,
  defaultIconColor,
} from "../constants/mappings";
import { EditorLanguageKey } from "../types/editor";
import { MockFile } from "../constants/mockFiles";

interface FileExplorerPanelProps {
  isSessionActive: boolean;
  handleOpenFile: (fileId: string) => void;
  mockFiles: { [key: string]: MockFile };
  activeFileId: string | null;
}

const FileExplorerPanel = ({
  handleOpenFile,
  mockFiles,
  activeFileId,
}: FileExplorerPanelProps) => {
  const [isProjectExpanded, setIsProjectExpanded] = useState(true);

  const toggleProjectFolder = () => {
    setIsProjectExpanded(!isProjectExpanded);
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="ds-panel-title">Explorer</div>
      <div className="w-full h-full overflow-y-auto flex-grow">
        <button
          type="button"
          className="flex items-center text-xs py-1.5 cursor-pointer w-full hover:bg-ink-600 pl-1"
          onClick={toggleProjectFolder}
        >
          <div
            className="flex items-center justify-center mr-1"
            style={{ width: "1rem" }}
          >
            {isProjectExpanded ? (
              <VscChevronDown
                size={16}
                className="flex-shrink-0 text-mist-500"
              />
            ) : (
              <VscChevronRight
                size={16}
                className="flex-shrink-0 text-mist-500"
              />
            )}
          </div>
          <span className="font-medium text-mist-300 truncate tracking-wide">
            DevSync Workspace
          </span>
        </button>

        {isProjectExpanded && (
          <div className="relative">
            <div className="absolute top-0 bottom-0 left-[12px] w-px bg-ink-500/70 z-0" />

            {Object.entries(mockFiles).map(([id, file]) => {
              const IconComponent =
                languageIconMap[file.language as EditorLanguageKey] || VscFile;
              const iconColor =
                languageColorMap[file.language as EditorLanguageKey] ||
                defaultIconColor;
              return (
                <div
                  key={id}
                  className={`relative flex items-center text-sm py-1.5 cursor-pointer w-full pl-4 z-10 transition-colors ${
                    activeFileId === id
                      ? "bg-signal/10 shadow-[inset_2px_0_0_#2ee6a6] hover:bg-signal/15"
                      : "hover:bg-ink-600/70"
                  }`}
                  onClick={() => handleOpenFile(id)}
                  title={file.name}
                >
                  <IconComponent
                    size={18}
                    className={`mr-1.5 flex-shrink-0 ${iconColor}`}
                  />
                  <span
                    className={`w-full truncate ${
                      activeFileId === id ? "text-mist-100" : "text-mist-400"
                    }`}
                  >
                    {file.name}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileExplorerPanel;
