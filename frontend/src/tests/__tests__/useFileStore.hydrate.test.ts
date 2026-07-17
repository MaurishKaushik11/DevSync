import { useFileStore } from "../../store/useFileStore";

describe("useFileStore hydrateFromRoomFiles", () => {
  it("loads room contents and opens only one initial tab", () => {
    useFileStore.getState().hydrateFromRoomFiles([
      {
        id: "index.html",
        persistenceId: "11111111-1111-1111-1111-111111111111",
        path: "index.html",
        language: "html",
        content: "<h1>hi</h1>",
        sizeBytes: 11,
        collaborationEnabled: true,
      },
      {
        id: "src/app.ts",
        persistenceId: "22222222-2222-2222-2222-222222222222",
        path: "src/app.ts",
        language: "typescript",
        content: "export const x = 1;",
        sizeBytes: 18,
        collaborationEnabled: true,
      },
    ]);

    const state = useFileStore.getState();
    expect(state.openFiles).toHaveLength(1);
    expect(state.openFiles[0].name).toBe("index.html");
    expect(state.fileContents["index.html"]).toBe("<h1>hi</h1>");
    expect(state.fileContents["src/app.ts"]).toBe("export const x = 1;");
    expect(state.activeFileId).toBe("index.html");
    expect(state.getPersistenceId("index.html")).toBe(
      "11111111-1111-1111-1111-111111111111"
    );
    expect(state.isCollaborationEnabled("index.html")).toBe(true);
    expect(state.getSizeBytes("index.html")).toBe(11);
  });

  it("keeps deferred large-file content null and collaboration disabled", () => {
    useFileStore.getState().hydrateFromRoomFiles([
      {
        id: "vendor/huge.js",
        persistenceId: "33333333-3333-3333-3333-333333333333",
        path: "vendor/huge.js",
        language: "javascript",
        content: null,
        sizeBytes: 2_000_000,
        collaborationEnabled: false,
      },
    ]);

    const state = useFileStore.getState();
    expect(state.fileContents["vendor/huge.js"]).toBeNull();
    expect(state.isContentLoaded("vendor/huge.js")).toBe(false);
    expect(state.isCollaborationEnabled("vendor/huge.js")).toBe(false);
    expect(state.getSizeBytes("vendor/huge.js")).toBe(2_000_000);
  });
});
