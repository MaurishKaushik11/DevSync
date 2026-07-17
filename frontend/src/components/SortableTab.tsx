import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import clsx from "clsx";
import { SortableTabProps } from "../types/editor";
import { useFileStore } from "../store/useFileStore";

export function SortableTab({
  file,
  activeFileId,
  IconComponent,
  iconColor,
  dropIndicatorSide,
  onSwitchTab,
  onCloseTab,
}: SortableTabProps) {
  const { listeners, setNodeRef, isDragging } = useSortable({ id: file.id });

  const storeSwitchTab = useFileStore((state) => state.switchTab);
  const storeCloseFile = useFileStore((state) => state.closeFile);

  // Use provided handlers or fallback to store
  const handleSwitchTab = onSwitchTab || storeSwitchTab;
  const handleCloseTab = onCloseTab || storeCloseFile;

  // Restore the style object for the indicator lines
  const style = {
    zIndex: activeFileId === file.id ? 10 : isDragging ? 20 : "auto",
    "--before-opacity": dropIndicatorSide === "left" ? 1 : 0,
    "--after-opacity": dropIndicatorSide === "right" ? 1 : 0,
  } as React.CSSProperties;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => handleSwitchTab(file.id)}
      {...listeners}
      className={clsx(
        "group pl-2.5 pr-3 py-1.5 border-r border-ink-500 flex items-center flex-shrink-0 relative transition-colors duration-150 ease-out",
        'before:content-[""] before:absolute before:inset-y-0 before:left-0 before:w-[2px] before:bg-signal before:transition-opacity before:duration-150 before:z-10 before:opacity-[var(--before-opacity,0)]',
        'after:content-[""] after:absolute after:inset-y-0 after:right-0 after:w-[2px] after:bg-signal after:transition-opacity after:duration-150 after:z-10 after:opacity-[var(--after-opacity,0)]',
        {
          "bg-ink-900 z-10 shadow-[inset_0_-1px_0_0_#2ee6a6]":
            activeFileId === file.id,
          "bg-ink-700/60 hover:bg-ink-600 z-0": activeFileId !== file.id,
          "opacity-50": isDragging,
        }
      )}
    >
      <IconComponent
        size={16}
        className={`mr-1.5 flex-shrink-0 ${iconColor}`}
      />
      <div className="flex items-center overflow-hidden">
        <span
          title={file.name}
          className={`text-sm select-none truncate ${
            activeFileId === file.id ? "text-mist-100" : "text-mist-400"
          }`}
        >
          {file.name}
        </span>
        <button
          className={`ml-1.5 text-mist-500 hover:text-mist-200 rounded-sm p-0.5 flex-shrink-0 z-20 hover:opacity-100 focus:opacity-100 ${
            activeFileId === file.id
              ? "opacity-60"
              : "opacity-0 group-hover:opacity-60 focus-within:opacity-60"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            handleCloseTab(file.id);
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
          aria-label={`Close ${file.name}`}
          title={`Close ${file.name}`}
        >
          ×
        </button>
      </div>
    </div>
  );
}
