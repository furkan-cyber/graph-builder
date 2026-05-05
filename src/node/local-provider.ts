import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { basename as pathBasename, join, resolve } from "node:path";
import fg from "fast-glob";
import ignore from "ignore";
import type { GraphBuilderProvider, GraphBuilderTextItem } from "../core/types.js";
import { normalizePath } from "../core/utils.js";

export interface LocalFileDescriptor {
  id: string;
  absPath: string;
  relPath: string;
  title: string;
}

export interface LocalFileProviderOptions {
  extensions?: string[];
  ignoreFile?: string;
  additionalIgnores?: string[];
}

export function createLocalFileProvider(
  root: string,
  options: LocalFileProviderOptions = {}
): GraphBuilderProvider<LocalFileDescriptor> {
  const absoluteRoot = resolve(root);
  const extensions = options.extensions ?? [
    ".md", ".mdx", ".txt", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".yml", ".yaml"
  ];
  const matcher = ignore();
  matcher.add([
    "node_modules",
    "dist",
    ".git",
    ".next",
    "coverage",
    "graph-builder-out",
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "bun.lockb",
    "**/*.tsbuildinfo",
    ".env*",
    ...(options.additionalIgnores ?? [])
  ]);

  return {
    name: "local",
    async *list() {
      const ignoreFilePath = join(absoluteRoot, options.ignoreFile ?? ".graph-builderignore");
      try {
        const ignoreFileContent = await readFile(ignoreFilePath, "utf8");
        matcher.add(ignoreFileContent.split(/\r?\n/));
      } catch {
        // Ignore absent ignore file.
      }

      const entries = await fg("**/*", {
        cwd: absoluteRoot,
        dot: false,
        onlyFiles: true,
        absolute: true,
        suppressErrors: true
      });

      for (const entry of entries) {
        const relPath = normalizePath(entry.replace(`${absoluteRoot}/`, "")) ?? entry;
        if (matcher.ignores(relPath)) {
          continue;
        }
        if (!extensions.some((extension) => relPath.endsWith(extension))) {
          continue;
        }
        yield {
          id: relPath,
          absPath: entry,
          relPath,
          title: pathBasename(relPath)
        };
      }
    },
    async read(item) {
      const text = await readFile(item.absPath, "utf8");
      const fileStat = await stat(item.absPath);
      const hash = createHash("sha256").update(text).digest("hex");
      const graphBuilderItem: GraphBuilderTextItem = {
        id: item.id,
        title: item.title,
        path: item.relPath,
        text,
        sourceType: "local-file",
        updatedAt: fileStat.mtime.toISOString(),
        hash,
        storageRef: {
          provider: "local",
          physicalId: item.absPath,
          logicalPath: item.relPath
        }
      };
      return graphBuilderItem;
    }
  };
}