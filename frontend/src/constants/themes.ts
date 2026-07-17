import * as monaco from "monaco-editor";

export type ThemeKey = keyof typeof THEMES;

export const THEMES = {
  devSyncTheme: {
    label: "DevSync",
    config: {
      base: "vs-dark",
      inherit: true,
      rules: [
        { background: "0a100e", token: "" },
        { foreground: "c5ddd4", token: "text" },
        {
          foreground: "5f7870",
          fontStyle: "italic",
          token: "comment",
        },
        { foreground: "7dd3c0", token: "meta.tag" },
        { foreground: "e8f5f0", token: "entity.name" },
        { foreground: "9bb5ac", token: "variable.other" },
        { foreground: "2ee6a6", token: "constant" },
        { foreground: "5ec4ff", token: "keyword" },
        { foreground: "f0c674", token: "string" },
        {
          fontStyle: "underline",
          token: "entity.name.class",
        },
      ],
      colors: {
        "editor.background": "#0a100e",
        "editor.foreground": "#c5ddd4",
        "editorLineNumber.foreground": "#3d564f",
        "editorLineNumber.activeForeground": "#7a948b",
        "editorGutter.background": "#0a100e",
        "minimap.background": "#00000000",
        "editor.selectionBackground": "#1fad7c44",
        "editor.inactiveSelectionBackground": "#243430",
        "editorIndentGuide.background": "#1a2522",
        "editorIndentGuide.activeBackground": "#314540",
        "editor.lineHighlightBackground": "#121a18",
        "editor.lineHighlightBorder": "#00000000",
        "editorCursor.foreground": "#2ee6a6",
        "editorWidget.background": "#0e1513",
        "editorWidget.border": "#243430",
        "input.background": "#070b0a",
        "input.border": "#243430",
        "focusBorder": "#2ee6a666",
      },
    } as monaco.editor.IStandaloneThemeData,
  },
  transparentTheme: {
    label: "VS Code",
    config: {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#00000000",
        "editorGutter.background": "#00000000",
        "minimap.background": "#00000000",
      },
    } as monaco.editor.IStandaloneThemeData,
  },
};
