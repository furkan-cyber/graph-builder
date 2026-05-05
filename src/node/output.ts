import { watch as fsWatch, type FSWatcher } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { createGraphBuilder } from "../core/graph-builder.js";
import type {
  GraphBuilderArtifactKind,
  GraphBuilderInput,
  GraphBuilderOptions,
  GraphBuilderResult
} from "../core/types.js";

export interface GraphBuilderOutputOptions {
  outDir?: string;
  cleanWiki?: boolean;
}

export interface BuildGraphBuilderOutputOptions extends GraphBuilderOutputOptions {
  artifacts?: GraphBuilderArtifactKind[];
  graphBuilderOptions?: Omit<GraphBuilderOptions, "artifacts">;
}

export interface GraphBuilderOutputResult {
  result: GraphBuilderResult;
  files: string[];
}

export interface GraphBuilderWatchHandle {
  ready: Promise<GraphBuilderOutputResult>;
  close(): void;
}

const DEFAULT_OUTPUT_DIR = "graph-builder-out";
const DEFAULT_OUTPUT_ARTIFACTS: GraphBuilderArtifactKind[] = [
  "json",
  "report",
  "html",
  "wiki",
  "timeline",
  "manifest",
  "dot",
  "graphml",
  "cypher"
];

export async function buildGraphBuilderOutput(
  input: GraphBuilderInput,
  options: BuildGraphBuilderOutputOptions = {}
): Promise<GraphBuilderOutputResult> {
  const artifacts = options.artifacts ?? DEFAULT_OUTPUT_ARTIFACTS;
  const builder = createGraphBuilder({ defaultArtifacts: artifacts });
  const result = await builder.build(input, {
    ...options.graphBuilderOptions,
    artifacts
  });
  const files = await writeGraphBuilderArtifacts(result, options);
  return { result, files };
}

export async function writeGraphBuilderArtifacts(
  result: GraphBuilderResult,
  options: GraphBuilderOutputOptions = {}
): Promise<string[]> {
  const outDir = resolve(options.outDir ?? DEFAULT_OUTPUT_DIR);
  await mkdir(outDir, { recursive: true });
  const files: string[] = [];

  const write = async (relativePath: string, content: string) => {
    const fullPath = join(outDir, relativePath);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, content, "utf8");
    files.push(fullPath);
  };

  if (result.artifacts.json) {
    await write("graph.json", result.artifacts.json);
  }
  if (result.artifacts.report) {
    await write("GRAPH_REPORT.md", result.artifacts.report);
  }
  if (result.artifacts.html) {
    await write("graph.html", result.artifacts.html);
  }
  if (result.artifacts.timeline) {
    await write("timeline.json", result.artifacts.timeline);
  }
  if (result.artifacts.manifest) {
    await write("manifest.json", result.artifacts.manifest);
  }
  if (result.artifacts.dot) {
    await write("graph.dot", result.artifacts.dot);
  }
  if (result.artifacts.graphml) {
    await write("graph.graphml", result.artifacts.graphml);
  }
  if (result.artifacts.cypher) {
    await write("graph.cypher", result.artifacts.cypher);
  }
  if (result.artifacts.wiki) {
    const wikiDir = join(outDir, "wiki");
    if (options.cleanWiki !== false) {
      await rm(wikiDir, { recursive: true, force: true });
    }
    await mkdir(wikiDir, { recursive: true });
    for (const [name, content] of Object.entries(result.artifacts.wiki)) {
      const safeName = name.replace(/(^|\/)\.\.(\/|$)/g, "_");
      await write(join("wiki", safeName), content);
    }
  }

  return files;
}

export function watchGraphBuilderOutput(
  root: string,
  options: BuildGraphBuilderOutputOptions & { debounceMs?: number } = {}
): GraphBuilderWatchHandle {
  const debounceMs = options.debounceMs ?? 250;
  let closed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let watcher: FSWatcher | undefined;

  const rebuild = () => buildGraphBuilderOutput(root, options);
  const ready = rebuild();

  watcher = fsWatch(resolve(root), { recursive: true }, () => {
    if (closed) {
      return;
    }
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      void rebuild();
    }, debounceMs);
  });

  return {
    ready,
    close() {
      closed = true;
      if (timer) {
        clearTimeout(timer);
      }
      watcher?.close();
    }
  };
}