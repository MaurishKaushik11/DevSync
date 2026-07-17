jest.mock("@webcontainer/api", () => ({
  WebContainer: { boot: jest.fn() },
}), { virtual: true });

import {
  createFileSystemTree,
  detectRuntimeProject,
} from "../../services/webContainerRuntime";

describe("webContainerRuntime project detection", () => {
  it("detects Vite and uses an explicit host binding", () => {
    const project = detectRuntimeProject([
      {
        path: "package.json",
        content: JSON.stringify({
          scripts: { dev: "vite" },
          devDependencies: { vite: "^6.0.0" },
        }),
      },
    ]);

    expect(project).toEqual({
      framework: "Vite",
      command: "npm",
      args: ["run", "dev", "--", "--host", "0.0.0.0"],
    });
  });

  it("builds nested files and excludes credential files", () => {
    const tree = createFileSystemTree([
      { path: "src/main.tsx", content: "export {}" },
      { path: ".env", content: "TOKEN=must-not-mount" },
      { path: "certs/private.pem", content: "must-not-mount" },
    ]);

    expect(tree).toEqual({
      src: {
        directory: {
          "main.tsx": { file: { contents: "export {}" } },
        },
      },
    });
    expect(tree).not.toHaveProperty(".env");
  });

  it("rejects path traversal", () => {
    expect(() =>
      createFileSystemTree([{ path: "../escape.js", content: "" }])
    ).toThrow("Unsafe project path");
  });
});
