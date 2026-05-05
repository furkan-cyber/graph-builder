import type { GraphBuilderTextItem } from "./types.js";

export function normalizeLabel(value: string): string {
  return stripDiacritics(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function stripDiacritics(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}

export function slugify(value: string): string {
  const normalized = normalizeLabel(value).replace(/\s+/g, "-");
  return normalized || "section";
}

export function normalizePath(value: string | undefined): string | undefined {
  return value?.replace(/\\/g, "/");
}

export function extensionOf(value: string | undefined): string {
  if (!value) {
    return "";
  }
  const normalized = normalizePath(value) ?? value;
  const lastSegment = normalized.split("/").at(-1) ?? normalized;
  const lastDot = lastSegment.lastIndexOf(".");
  return lastDot >= 0 ? lastSegment.slice(lastDot).toLowerCase() : "";
}

export function withoutExtension(value: string): string {
  const normalized = normalizePath(value) ?? value;
  const lastSegment = normalized.split("/").at(-1) ?? normalized;
  const lastDot = lastSegment.lastIndexOf(".");
  if (lastDot < 0) {
    return normalized;
  }
  return `${normalized.slice(0, normalized.length - (lastSegment.length - lastDot))}${lastSegment.slice(0, lastDot)}`;
}

export function resolveRelativePath(basePath: string | undefined, targetPath: string): string {
  const normalizedTarget = normalizePath(targetPath) ?? targetPath;
  if (normalizedTarget.startsWith("@/")) {
    return normalizedTarget.replace(/^@\//, "src/");
  }
  if (!normalizedTarget.startsWith(".")) {
    return normalizedTarget;
  }

  const base = normalizePath(basePath) ?? "";
  const baseParts = base.split("/").filter(Boolean);
  baseParts.pop();

  for (const part of normalizedTarget.split("/")) {
    if (!part || part === ".") {
      continue;
    }
    if (part === "..") {
      baseParts.pop();
      continue;
    }
    baseParts.push(part);
  }

  return baseParts.join("/");
}

export async function collectAsync<T>(iterable: AsyncIterable<T> | Iterable<T>): Promise<T[]> {
  const items: T[] = [];
  for await (const item of iterable as AsyncIterable<T>) {
    items.push(item);
  }
  return items;
}

export function isAsyncIterable<T>(value: unknown): value is AsyncIterable<T> {
  return typeof value === "object" && value !== null && Symbol.asyncIterator in value;
}

export function isIterable<T>(value: unknown): value is Iterable<T> {
  return typeof value === "object" && value !== null && Symbol.iterator in value;
}

export function inferTitle(item: GraphBuilderTextItem): string {
  return item.title ?? basename(item.path) ?? item.url ?? item.id;
}

export function basename(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const normalized = normalizePath(value) ?? value;
  return normalized.split("/").filter(Boolean).at(-1);
}

export function locationLabel(line: number | undefined): string | undefined {
  return line ? `L${line}` : undefined;
}

export function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}