import type {
  GraphBuilderInput,
  GraphBuilderOptions,
  GraphBuilderProvider,
  GraphBuilderSourceDescriptor,
  GraphBuilderTextItem
} from "./types.js";
import { collectAsync, isAsyncIterable, isIterable, normalizePath } from "./utils.js";

export function isGraphBuilderProvider(value: unknown): value is GraphBuilderProvider {
  return typeof value === "object" && value !== null && "list" in value && "read" in value;
}

export function isGraphBuilderTextItem(value: unknown): value is GraphBuilderTextItem {
  return typeof value === "object" && value !== null && "id" in value && "text" in value;
}

export function createArrayProvider(
  items: GraphBuilderTextItem[],
  name = "memory"
): GraphBuilderProvider<GraphBuilderTextItem> {
  return {
    name,
    async *list() {
      for (const item of items) {
        yield item;
      }
    },
    async read(item) {
      return item;
    }
  };
}

export async function collectTextItems(
  input: GraphBuilderInput,
  options: GraphBuilderOptions = {}
): Promise<GraphBuilderTextItem[]> {
  if (typeof input === "string") {
    const { createLocalFileProvider } = await import("../node.js");
    return readProvider(createLocalFileProvider(input), options);
  }

  if (isGraphBuilderProvider(input)) {
    return readProvider(input, options);
  }

  if (isGraphBuilderTextItem(input)) {
    return applyPermissionFilter([normalizeTextItem(input)], options);
  }

  if (isAsyncIterable<GraphBuilderTextItem>(input)) {
    const items = (await collectAsync(input)).map(normalizeTextItem);
    return applyPermissionFilter(items, options);
  }

  if (isIterable<GraphBuilderTextItem>(input)) {
    const items = [...input].map(normalizeTextItem);
    return applyPermissionFilter(items, options);
  }

  throw new TypeError("Unsupported Graph Builder input. Expected a path, text item, iterable, async iterable, or provider.");
}

export async function readProvider<TDescriptor extends GraphBuilderSourceDescriptor>(
  provider: GraphBuilderProvider<TDescriptor>,
  options: GraphBuilderOptions = {}
): Promise<GraphBuilderTextItem[]> {
  const listed = await provider.list(options.providerOptions);
  const descriptors = await collectAsync(listed);
  const items: GraphBuilderTextItem[] = [];

  for (const descriptor of descriptors) {
    const readResult = await provider.read(descriptor);
    const nextItems = Array.isArray(readResult) ? readResult : [readResult];
    items.push(...nextItems.map(normalizeTextItem));
  }

  return applyPermissionFilter(items, options);
}

export async function collectChangedTextItems<TDescriptor extends GraphBuilderSourceDescriptor>(
  provider: GraphBuilderProvider<TDescriptor>,
  cursor?: string,
  options: GraphBuilderOptions = {}
): Promise<GraphBuilderTextItem[]> {
  const listed = provider.changes ? await provider.changes(cursor) : await provider.list(options.providerOptions);
  const descriptors = await collectAsync(listed);
  const items: GraphBuilderTextItem[] = [];

  for (const descriptor of descriptors) {
    const readResult = await provider.read(descriptor);
    const nextItems = Array.isArray(readResult) ? readResult : [readResult];
    items.push(...nextItems.map(normalizeTextItem));
  }

  return applyPermissionFilter(items, options);
}

async function applyPermissionFilter(
  items: GraphBuilderTextItem[],
  options: GraphBuilderOptions
): Promise<GraphBuilderTextItem[]> {
  if (!options.permissionFilter) {
    return items;
  }

  const filtered: GraphBuilderTextItem[] = [];
  for (const item of items) {
    if (await options.permissionFilter(item)) {
      filtered.push(item);
    }
  }
  return filtered;
}

export function normalizeTextItem(item: GraphBuilderTextItem): GraphBuilderTextItem {
  return {
    ...item,
    path: normalizePath(item.path),
    storageRef: item.storageRef ?? {
      provider: item.sourceType ?? "memory",
      logicalPath: normalizePath(item.path)
    },
    sourceType: item.sourceType ?? "text"
  };
}