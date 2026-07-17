import React, { useEffect } from "react";
import {
  VscCaseSensitive,
  VscWholeWord,
  VscRegex,
  VscReplaceAll,
  VscPreserveCase,
} from "react-icons/vsc";
import { SearchOptions, MatchInfo } from "../types/editor";
import { useFileStore } from "../store/useFileStore";

export interface SearchPanelProps {
  activeIcon: string | null;
  onExecuteSearch: (term: string, options: SearchOptions) => void;
  onExecuteReplaceAll: () => void;
  matchInfo: MatchInfo | null;
  searchOptions: SearchOptions;
  onToggleSearchOption: (optionKey: keyof SearchOptions) => void;
  replaceValue: string;
  onReplaceChange: (value: string) => void;
}

const SearchPanel = ({
  activeIcon,
  onExecuteSearch,
  onExecuteReplaceAll,
  matchInfo,
  searchOptions,
  onToggleSearchOption,
  replaceValue,
  onReplaceChange,
}: SearchPanelProps) => {
  const localSearchTerm = useFileStore((state) => state.searchTerm);
  const setLocalSearchTerm = useFileStore((state) => state.setSearchTerm);

  useEffect(() => {
    if (activeIcon === "search") {
      onExecuteSearch(localSearchTerm, searchOptions);
    }
  }, [localSearchTerm, searchOptions, activeIcon, onExecuteSearch]);

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearchTerm(e.target.value);
  };

  const handleReplaceInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onReplaceChange(e.target.value);
  };

  const handleToggleOptionClick = (optionKey: keyof SearchOptions) => {
    onToggleSearchOption(optionKey);
  };

  const handleReplaceAllClick = () => {
    if (localSearchTerm && matchInfo && matchInfo.totalMatches > 0) {
      onExecuteReplaceAll();
    }
  };

  const formatMatchCount = (): string => {
    if (!matchInfo || matchInfo.totalMatches === 0) {
      return "No results";
    }
    if (matchInfo.totalMatches === 1) {
      return "1 result";
    }
    return `${matchInfo.totalMatches} results`;
  };

  if (activeIcon !== "search") {
    return null;
  }

  return (
    <div
      className={`flex flex-col flex-1 ${
        activeIcon === "search" ? "" : "hidden"
      }`}
    >
      {/* Sticky Header */}
      <div className="ds-panel-title">
        Search
      </div>
      {/* Input Container */}
      <div className="pl-4 py-2 flex flex-col space-y-1 pr-2">
        {/* Search Input Row */}
        <div className="relative flex items-center">
          <input
            type="text"
            placeholder="Search"
            value={localSearchTerm}
            onChange={handleSearchInputChange}
            className="w-full bg-ink-900 border border-ink-500 text-mist-100 placeholder-mist-500 pl-3 pr-24 py-1 text-sm focus:outline-none focus:border-signal/50 transition-colors h-7 rounded-md"
          />
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center space-x-0.5">
            <button
              title="Match Case"
              onClick={() => handleToggleOptionClick("matchCase")}
              className={`p-0.5 rounded ${
                searchOptions.matchCase
                  ? "bg-signal/20 text-signal"
                  : "text-mist-400 hover:bg-ink-600"
              }`}
            >
              <VscCaseSensitive size={14} />
            </button>
            <button
              title="Match Whole Word"
              onClick={() => handleToggleOptionClick("wholeWord")}
              className={`p-0.5 rounded ${
                searchOptions.wholeWord
                  ? "bg-signal/20 text-signal"
                  : "text-mist-400 hover:bg-ink-600"
              }`}
            >
              <VscWholeWord size={14} />
            </button>
            <button
              title="Use Regular Expression"
              onClick={() => handleToggleOptionClick("isRegex")}
              className={`p-0.5 rounded ${
                searchOptions.isRegex
                  ? "bg-signal/20 text-signal"
                  : "text-mist-400 hover:bg-ink-600"
              }`}
            >
              <VscRegex size={14} />
            </button>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <div className="relative flex-grow flex items-center">
            <input
              type="text"
              placeholder="Replace"
              value={replaceValue}
              onChange={handleReplaceInputChange}
              className="w-full bg-ink-900 border border-ink-500 text-mist-100 placeholder-mist-500 pl-3 pr-8 py-1 text-sm focus:outline-none focus:border-signal/50 transition-colors h-7 rounded-md"
            />
            {/* Preserve Case Button */}
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center">
              <button
                title="Preserve Case (Ab)"
                onClick={() => handleToggleOptionClick("preserveCase")}
                className={`p-0.5 rounded ${
                  searchOptions.preserveCase
                    ? "bg-signal/20 text-signal"
                    : "text-mist-400 hover:bg-ink-600"
                }`}
              >
                <VscPreserveCase size={14} />
              </button>
            </div>
          </div>
          {/* Replace All Button */}
          <button
            title="Replace All"
            onClick={handleReplaceAllClick}
            disabled={
              !localSearchTerm || !matchInfo || matchInfo.totalMatches === 0
            }
            className="p-1 rounded text-mist-400 hover:bg-ink-600 disabled:text-ink-400 disabled:cursor-not-allowed flex-shrink-0 h-7 w-7 flex items-center justify-center"
          >
            <VscReplaceAll size={16} />
          </button>
        </div>

        <div className="text-xs text-mist-500 text-left pl-1 h-4 pt-1 font-mono">
          {formatMatchCount()}
        </div>
      </div>
    </div>
  );
};

export default SearchPanel;
