import type {
  GraphBuilderChangeSet,
  GraphBuilderEdge,
  GraphBuilderExtraction,
  GraphBuilderGraph,
  GraphBuilderSnapshot,
  GraphBuilderTextItem,
  GraphBuilderTimelineEntry,
  GraphBuilderTimelineEvent
} from "./types.js";

export function attachGraphHistory(
  graph: GraphBuilderGraph,
  options: {
    timestamp?: string;
    label?: string;
    previousGraph?: GraphBuilderGraph;
    timelineEntries?: GraphBuilderTimelineEntry[];
    changes?: GraphBuilderChangeSet;
  } = {}
): GraphBuilderGraph {
  const timestamp = options.timestamp ?? new Date().toISOString();
  const previousSnapshots = options.previousGraph?.snapshots ?? [];
  const previousTimeline = options.previousGraph?.timeline ?? [];
  const timeline = [...previousTimeline, ...(options.timelineEntries ?? [])];
  const snapshots = [...previousSnapshots, createSnapshot(graph, options.label, timestamp)];

  return {
    ...graph,
    updatedAt: timestamp,
    timeline,
    snapshots,
    changes: options.changes,
    stats: {
      ...graph.stats,
      snapshotCount: snapshots.length,
      timelineEventCount: timeline.length
    }
  };
}

export function createInitialTimeline(extractions: GraphBuilderExtraction[], timestamp: string): GraphBuilderTimelineEntry[] {
  return extractions.map((extraction) => createTimelineEntry({
    item: extraction.item,
    event: "added",
    timestamp,
    nodeIds: extraction.nodes.map((node) => node.id)
  }));
}

export function createUpdateTimeline(
  previousGraph: GraphBuilderGraph,
  upsertItems: GraphBuilderTextItem[],
  deleteSourceItemIds: string[],
  timestamp: string
): GraphBuilderTimelineEntry[] {
  const previousHashes = sourceHashes(previousGraph);
  const previousSourceIds = new Set(previousGraph.nodes.map((node) => node.sourceItemId).filter((value): value is string => Boolean(value)));
  const entries: GraphBuilderTimelineEntry[] = [];

  for (const item of upsertItems) {
    entries.push(createTimelineEntry({
      item,
      event: previousSourceIds.has(item.id) ? "updated" : "added",
      timestamp,
      previousHash: previousHashes[item.id]
    }));
  }

  for (const sourceItemId of deleteSourceItemIds) {
    entries.push({
      id: `${timestamp}:removed:${sourceItemId}`,
      timestamp,
      event: "removed",
      sourceItemId,
      previousHash: previousHashes[sourceItemId]
    });
  }

  return entries;
}

export function createSnapshot(graph: GraphBuilderGraph, label = "snapshot", timestamp = new Date().toISOString()): GraphBuilderSnapshot {
  return {
    id: `${timestamp}:${label}`,
    timestamp,
    label,
    nodeCount: graph.nodes.length,
    edgeCount: graph.edges.length,
    sourceCount: new Set(graph.nodes.map((node) => node.sourceItemId).filter(Boolean)).size,
    communityCount: graph.stats.communityCount,
    sourceHashes: sourceHashes(graph)
  };
}

export function diffGraphs(previous: GraphBuilderGraph, next: GraphBuilderGraph, timestamp = new Date().toISOString()): GraphBuilderChangeSet {
  const previousNodes = new Map(previous.nodes.map((node) => [node.id, stableStringify(node)]));
  const nextNodes = new Map(next.nodes.map((node) => [node.id, stableStringify(node)]));
  const previousEdges = new Map(previous.edges.map((edge) => [edgeKey(edge), stableStringify(edge)]));
  const nextEdges = new Map(next.edges.map((edge) => [edgeKey(edge), stableStringify(edge)]));

  const addedNodes = [...nextNodes.keys()].filter((id) => !previousNodes.has(id));
  const removedNodes = [...previousNodes.keys()].filter((id) => !nextNodes.has(id));
  const changedNodes = [...nextNodes.keys()].filter((id) => previousNodes.has(id) && previousNodes.get(id) !== nextNodes.get(id));
  const addedEdges = [...nextEdges.keys()].filter((id) => !previousEdges.has(id));
  const removedEdges = [...previousEdges.keys()].filter((id) => !nextEdges.has(id));

  const nextNodeById = new Map(next.nodes.map((node) => [node.id, node]));
  const previousNodeById = new Map(previous.nodes.map((node) => [node.id, node]));
  const changedSourceItemIds = new Set<string>();
  for (const nodeId of [...addedNodes, ...removedNodes, ...changedNodes]) {
    const sourceItemId = nextNodeById.get(nodeId)?.sourceItemId ?? previousNodeById.get(nodeId)?.sourceItemId;
    if (sourceItemId) {
      changedSourceItemIds.add(sourceItemId);
    }
  }

  return {
    timestamp,
    addedNodes,
    removedNodes,
    changedNodes,
    addedEdges,
    removedEdges,
    changedSourceItemIds: [...changedSourceItemIds].sort(),
    summary: {
      addedNodeCount: addedNodes.length,
      removedNodeCount: removedNodes.length,
      changedNodeCount: changedNodes.length,
      addedEdgeCount: addedEdges.length,
      removedEdgeCount: removedEdges.length,
      changedSourceCount: changedSourceItemIds.size
    }
  };
}

function createTimelineEntry(options: {
  item: GraphBuilderTextItem;
  event: GraphBuilderTimelineEvent;
  timestamp: string;
  previousHash?: string;
  nodeIds?: string[];
}): GraphBuilderTimelineEntry {
  return {
    id: `${options.timestamp}:${options.event}:${options.item.id}`,
    timestamp: options.timestamp,
    event: options.event,
    sourceItemId: options.item.id,
    label: options.item.title,
    hash: options.item.hash,
    previousHash: options.previousHash,
    nodeIds: options.nodeIds,
    metadata: {
      path: options.item.path,
      updatedAt: options.item.updatedAt,
      sourceType: options.item.sourceType
    }
  };
}

function sourceHashes(graph: GraphBuilderGraph): Record<string, string> {
  const hashes: Record<string, string> = {};
  for (const node of graph.nodes) {
    if (!node.sourceItemId) {
      continue;
    }
    const hash = node.metadata?.hash;
    if (typeof hash === "string") {
      hashes[node.sourceItemId] = hash;
    }
  }
  return hashes;
}

function edgeKey(edge: GraphBuilderEdge): string {
  return `${edge.source}:${edge.target}:${edge.relation}:${edge.sourceItemId ?? ""}:${edge.context ?? ""}`;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }
  if (typeof value === "object" && value !== null) {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      result[key] = sortValue((value as Record<string, unknown>)[key]);
    }
    return result;
  }
  return value;
}