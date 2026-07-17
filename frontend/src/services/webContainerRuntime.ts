import {
  WebContainer,
  type FileSystemTree,
  type WebContainerProcess,
} from "@webcontainer/api";

export interface RuntimeProjectFile {
  path: string;
  content: string;
}

export interface RuntimeCallbacks {
  onOutput: (output: string) => void;
  onServerReady: (url: string) => void;
}

export interface RuntimeProject {
  framework: "Vite" | "Next.js" | "Vue CLI" | "Node.js";
  command: string;
  args: string[];
}

let containerPromise: Promise<WebContainer> | null = null;
let runningProcess: WebContainerProcess | null = null;
let unsubscribeServerReady: (() => void) | null = null;

function normalizeProjectPath(path: string): string {
  const normalized = path.replace(/\\/g, "/").replace(/^\.\/+/, "");
  const parts: string[] = normalized.split("/");

  if (
    !normalized ||
    normalized.startsWith("/") ||
    normalized.includes("\0") ||
    parts.some((part) => !part || part === "." || part === "..")
  ) {
    throw new Error(`Unsafe project path: ${path}`);
  }

  return parts.join("/");
}

function isSensitiveProjectPath(path: string): boolean {
  const fileName = path.split("/").at(-1)?.toLowerCase() ?? "";
  return (
    fileName === ".env" ||
    fileName.startsWith(".env.") ||
    ["id_rsa", "id_ed25519", "credentials.json", "service-account.json"].includes(
      fileName
    ) ||
    [".pem", ".key", ".p12", ".pfx"].some((extension) =>
      fileName.endsWith(extension)
    )
  );
}

export function createFileSystemTree(
  files: RuntimeProjectFile[]
): FileSystemTree {
  const tree: FileSystemTree = {};

  for (const projectFile of files) {
    const normalizedPath = normalizeProjectPath(projectFile.path);
    if (isSensitiveProjectPath(normalizedPath)) continue;
    const parts = normalizedPath.split("/");
    const fileName = parts.pop();
    if (!fileName) continue;

    let directory = tree;
    for (const part of parts) {
      const existing = directory[part];
      if (!existing) {
        directory[part] = { directory: {} };
      } else if (!("directory" in existing)) {
        throw new Error(`File path conflicts with directory: ${projectFile.path}`);
      }
      directory = (directory[part] as { directory: FileSystemTree }).directory;
    }

    directory[fileName] = {
      file: { contents: projectFile.content },
    };
  }

  return tree;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function detectRuntimeProject(
  files: RuntimeProjectFile[]
): RuntimeProject | null {
  const packageFile = files.find(
    (file) => normalizeProjectPath(file.path) === "package.json"
  );
  if (!packageFile) return null;

  let packageJson: Record<string, unknown>;
  try {
    packageJson = asRecord(JSON.parse(packageFile.content));
  } catch {
    throw new Error("package.json is not valid JSON.");
  }

  const scripts = asRecord(packageJson.scripts);
  const dependencies = {
    ...asRecord(packageJson.dependencies),
    ...asRecord(packageJson.devDependencies),
  };

  if (typeof scripts.dev === "string" && "vite" in dependencies) {
    return {
      framework: "Vite",
      command: "npm",
      args: ["run", "dev", "--", "--host", "0.0.0.0"],
    };
  }

  if (typeof scripts.dev === "string" && "next" in dependencies) {
    return {
      framework: "Next.js",
      command: "npm",
      args: ["run", "dev", "--", "--hostname", "0.0.0.0"],
    };
  }

  if (typeof scripts.serve === "string" && "@vue/cli-service" in dependencies) {
    return {
      framework: "Vue CLI",
      command: "npm",
      args: ["run", "serve", "--", "--host", "0.0.0.0"],
    };
  }

  if (typeof scripts.dev === "string") {
    return { framework: "Node.js", command: "npm", args: ["run", "dev"] };
  }

  if (typeof scripts.start === "string") {
    return { framework: "Node.js", command: "npm", args: ["run", "start"] };
  }

  throw new Error(
    'No supported "dev", "serve", or "start" script found in package.json.'
  );
}

async function getContainer(): Promise<WebContainer> {
  if (!window.crossOriginIsolated) {
    throw new Error(
      "Node preview requires cross-origin isolation. Hard-refresh after the latest deployment."
    );
  }

  containerPromise ??= WebContainer.boot({
    coep: "credentialless",
    forwardPreviewErrors: "exceptions-only",
    workdirName: "devsync-project",
  });
  return containerPromise;
}

function streamOutput(
  process: WebContainerProcess,
  onOutput: (output: string) => void
): void {
  void process.output
    .pipeTo(
      new WritableStream<string>({
        write(chunk) {
          onOutput(chunk);
        },
      })
    )
    .catch((error: unknown) => {
      onOutput(
        `\n[DevSync] Output stream failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }\n`
      );
    });
}

async function waitForInstall(
  process: WebContainerProcess,
  timeoutMs: number
): Promise<number> {
  let timeoutId: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => {
      process.kill();
      reject(new Error("Dependency installation timed out after two minutes."));
    }, timeoutMs);
  });

  try {
    return await Promise.race([process.exit, timeout]);
  } finally {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
  }
}

export async function startNodePreview(
  files: RuntimeProjectFile[],
  callbacks: RuntimeCallbacks
): Promise<RuntimeProject> {
  const project = detectRuntimeProject(files);
  if (!project) {
    throw new Error(
      "This room has no package.json. Use the static HTML preview instead."
    );
  }

  callbacks.onOutput(
    `\n[DevSync] Starting ${project.framework} browser runtime…\n`
  );

  const container = await getContainer();
  runningProcess?.kill();
  runningProcess = null;

  unsubscribeServerReady?.();
  unsubscribeServerReady = container.on("server-ready", (_port, url) => {
    if (url.startsWith("https://") || url.startsWith("http://")) {
      callbacks.onServerReady(url);
    }
  });

  await container.mount(createFileSystemTree(files));

  callbacks.onOutput("[DevSync] Installing npm dependencies…\n");
  const install = await container.spawn("npm", [
    "install",
    "--no-audit",
    "--no-fund",
  ]);
  streamOutput(install, callbacks.onOutput);
  const installExitCode = await waitForInstall(install, 120_000);
  if (installExitCode !== 0) {
    throw new Error(`npm install failed with exit code ${installExitCode}.`);
  }

  callbacks.onOutput(
    `[DevSync] Running: ${project.command} ${project.args.join(" ")}\n`
  );
  runningProcess = await container.spawn(project.command, project.args);
  streamOutput(runningProcess, callbacks.onOutput);

  void runningProcess.exit.then((exitCode) => {
    callbacks.onOutput(
      `\n[DevSync] Development server exited with code ${exitCode}.\n`
    );
  });

  return project;
}

export async function writeRuntimeFile(
  path: string,
  content: string
): Promise<void> {
  if (!containerPromise || !runningProcess) return;
  const container = await containerPromise;
  await container.fs.writeFile(normalizeProjectPath(path), content);
}

export function stopNodePreview(): void {
  runningProcess?.kill();
  runningProcess = null;
  unsubscribeServerReady?.();
  unsubscribeServerReady = null;
}
