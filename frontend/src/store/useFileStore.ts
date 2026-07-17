import { create } from "zustand";
import {
  OpenFile,
  EditorLanguageKey,
  SearchOptions,
  MatchInfo,
} from "../types/editor";
import { MOCK_FILES } from "../constants/mockFiles";

const initialOpenFileIds = ["index.html", "style.css", "script.js"];

const initialOpenFilesData = initialOpenFileIds.map((id): OpenFile => {
  const fileData = MOCK_FILES[id];
  if (!fileData) {
    console.error(`Initial file ${id} not found in MOCK_FILES!`);
    return { id, name: "Error", language: "plaintext" as EditorLanguageKey };
  }
  return {
    id: id,
    name: fileData.name,
    language: fileData.language as EditorLanguageKey,
  };
});

const initialFileContents: { [id: string]: string } = {};
initialOpenFileIds.forEach((id) => {
  const fileData = MOCK_FILES[id];
  if (fileData) {
    initialFileContents[id] = fileData.content;
  } else {
    initialFileContents[id] = `// Error: Content for ${id} not found`;
  }
});

const initialActiveFileId = initialOpenFileIds[0] || null;

const initialSearchOptions: SearchOptions = {
  matchCase: false,
  wholeWord: false,
  isRegex: false,
  preserveCase: false,
};

interface FileState {
  openFiles: OpenFile[];
  activeFileId: string | null;
  /** null = deferred / not yet loaded (large files) */
  fileContents: { [id: string]: string | null };
  /** Maps OT document id (filename) -> Postgres RoomFile UUID for save API */
  persistenceIds: { [documentId: string]: string };
  sizeBytes: { [documentId: string]: number };
  collaborationEnabled: { [documentId: string]: boolean };

  draggingId: string | null;
  dropIndicator: { tabId: string | null; side: "left" | "right" | null };

  // Search State
  searchTerm: string;
  replaceTerm: string;
  searchOptions: SearchOptions;
  matchInfo: MatchInfo | null;
}

export interface RoomFileInput {
  id: string;
  persistenceId?: string;
  path: string;
  language: string;
  content: string | null;
  sizeBytes?: number;
  collaborationEnabled?: boolean;
}

interface FileActions {
  setOpenFiles: (
    files: OpenFile[] | ((prev: OpenFile[]) => OpenFile[])
  ) => void;
  setActiveFileId: (id: string | null) => void;
  setFileContent: (id: string, content: string) => void;
  setDraggingId: (id: string | null) => void;
  setDropIndicator: (indicator: FileState["dropIndicator"]) => void;
  openFile: (fileId: string, isSessionActive: boolean) => void;
  closeFile: (fileIdToClose: string) => void;
  switchTab: (fileId: string) => void;
  hydrateFromRoomFiles: (files: RoomFileInput[]) => void;
  getPersistenceId: (documentId: string) => string | null;
  getSizeBytes: (documentId: string) => number;
  isCollaborationEnabled: (documentId: string) => boolean;
  isContentLoaded: (documentId: string) => boolean;
  resetToDefaults: () => void;

  // Search Actions
  setSearchTerm: (term: string) => void;
  setReplaceTerm: (term: string) => void;
  toggleSearchOption: (option: keyof SearchOptions) => void;
  setMatchInfo: (info: MatchInfo | null) => void;
  resetSearch: () => void;
}

export const useFileStore = create<FileState & FileActions>((set, get) => ({
  openFiles: initialOpenFilesData,
  activeFileId: initialActiveFileId,
  fileContents: initialFileContents,
  persistenceIds: {},
  sizeBytes: {},
  collaborationEnabled: {},
  draggingId: null,
  dropIndicator: { tabId: null, side: null },

  // Initial Search State
  searchTerm: "",
  replaceTerm: "",
  searchOptions: initialSearchOptions,
  matchInfo: null,

  setOpenFiles: (files) =>
    set((state) => ({
      openFiles: typeof files === "function" ? files(state.openFiles) : files,
    })),
  setActiveFileId: (id) => set({ activeFileId: id }),
  setFileContent: (id, content) =>
    set((state) => ({
      fileContents: { ...state.fileContents, [id]: content },
    })),
  setDraggingId: (id) => set({ draggingId: id }),
  setDropIndicator: (indicator) => set({ dropIndicator: indicator }),

  switchTab: (fileId) => {
    set({ activeFileId: fileId });
  },

  hydrateFromRoomFiles: (files) => {
    if (!files.length) {
      set({
        openFiles: [],
        activeFileId: null,
        fileContents: {},
        persistenceIds: {},
        sizeBytes: {},
        collaborationEnabled: {},
      });
      return;
    }

    const allFiles: OpenFile[] = files.map((file) => {
      const documentId = file.id || file.path;
      const displayName = (file.path || documentId).includes("/")
        ? (file.path || documentId).slice(
            (file.path || documentId).lastIndexOf("/") + 1
          )
        : file.path || documentId;
      return {
        id: documentId,
        name: displayName,
        language: (file.language || "plaintext") as EditorLanguageKey,
      };
    });
    // Imported repositories can contain hundreds of files. Start with one
    // useful tab and let the explorer open the rest on demand.
    const preferredIndex = files.findIndex((file) => {
      const path = (file.path || file.id).toLowerCase();
      return path === "readme.md";
    });
    const fallbackIndex = files.findIndex((file) => {
      const path = (file.path || file.id).toLowerCase();
      return path === "index.html";
    });
    const initialIndex =
      preferredIndex >= 0 ? preferredIndex : fallbackIndex >= 0 ? fallbackIndex : 0;
    const openFiles = allFiles[initialIndex] ? [allFiles[initialIndex]] : [];

    const fileContents: { [id: string]: string | null } = {};
    const persistenceIds: { [documentId: string]: string } = {};
    const sizeBytes: { [documentId: string]: number } = {};
    const collaborationEnabled: { [documentId: string]: boolean } = {};
    files.forEach((file) => {
      const documentId = file.id || file.path;
      // Preserve null so large files stay lazy-loaded
      fileContents[documentId] =
        file.content === undefined ? null : file.content;
      if (file.persistenceId) {
        persistenceIds[documentId] = file.persistenceId;
      }
      sizeBytes[documentId] =
        typeof file.sizeBytes === "number" ? file.sizeBytes : 0;
      collaborationEnabled[documentId] = file.collaborationEnabled !== false;
    });

    set({
      openFiles,
      activeFileId: openFiles[0]?.id ?? null,
      fileContents,
      persistenceIds,
      sizeBytes,
      collaborationEnabled,
    });
  },

  getPersistenceId: (documentId) => {
    return get().persistenceIds[documentId] ?? null;
  },

  getSizeBytes: (documentId) => {
    return get().sizeBytes[documentId] ?? 0;
  },

  isCollaborationEnabled: (documentId) => {
    return get().collaborationEnabled[documentId] !== false;
  },

  isContentLoaded: (documentId) => {
    return get().fileContents[documentId] != null;
  },

  resetToDefaults: () => {
    set({
      openFiles: initialOpenFilesData,
      activeFileId: initialActiveFileId,
      fileContents: { ...initialFileContents },
      persistenceIds: {},
      sizeBytes: {},
      collaborationEnabled: {},
    });
  },

  openFile: (fileId) => {
    const state = get();
    const alreadyOpen = state.openFiles.find((f) => f.id === fileId);
    if (alreadyOpen) {
      set({ activeFileId: fileId });
      return;
    }

    const fileData = MOCK_FILES[fileId];
    if (!fileData) {
      // Room files may already be in contents but not open
      if (state.fileContents[fileId] !== undefined) {
        const name = fileId.includes("/")
          ? fileId.slice(fileId.lastIndexOf("/") + 1)
          : fileId;
        set({
          openFiles: [
            ...state.openFiles,
            {
              id: fileId,
              name,
              language: "plaintext" as EditorLanguageKey,
            },
          ],
          activeFileId: fileId,
        });
        return;
      }
      console.error(`Cannot open file: ${fileId} not found.`);
      return;
    }

    const newOpenFile: OpenFile = {
      id: fileId,
      name: fileData.name,
      language: fileData.language as EditorLanguageKey,
    };

    const newStateUpdate: Partial<FileState> = {
      openFiles: [...state.openFiles, newOpenFile],
      activeFileId: fileId,
    };

    if (state.fileContents[fileId] === undefined) {
      newStateUpdate.fileContents = {
        ...state.fileContents,
        [fileId]: fileData.content,
      };
    }

    set(newStateUpdate);
  },

  closeFile: (fileIdToClose) => {
    const state = get();
    const indexToRemove = state.openFiles.findIndex(
      (f) => f.id === fileIdToClose
    );

    if (indexToRemove === -1) return;

    let nextActiveId: string | null = state.activeFileId;

    if (state.activeFileId === fileIdToClose) {
      if (state.openFiles.length > 1) {
        const newIndex = Math.max(0, indexToRemove - 1);
        nextActiveId =
          state.openFiles[newIndex]?.id ?? state.openFiles[0]?.id ?? null;
        const remainingFiles = state.openFiles.filter(
          (f) => f.id !== fileIdToClose
        );
        nextActiveId =
          remainingFiles[Math.max(0, indexToRemove - 1)]?.id ??
          remainingFiles[0]?.id ??
          null;
      } else {
        nextActiveId = null;
      }
    }

    // Update state: filter closed file and set new active ID
    set({
      openFiles: state.openFiles.filter((f) => f.id !== fileIdToClose),
      activeFileId: nextActiveId,
    });
  },

  // Search Action Implementations
  setSearchTerm: (term) => set({ searchTerm: term }),
  setReplaceTerm: (term) => set({ replaceTerm: term }),
  toggleSearchOption: (option) =>
    set((state) => ({
      searchOptions: {
        ...state.searchOptions,
        [option]: !state.searchOptions[option],
      },
    })),
  setMatchInfo: (info) => set({ matchInfo: info }),
  resetSearch: () =>
    set({
      searchTerm: "",
      replaceTerm: "",
      matchInfo: null,
      // searchOptions are intentionally not reset here, user might want to keep them
    }),
}));
