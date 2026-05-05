import { sanitizeLabel } from "./security.js";
import type {
  GraphBuilderEdge,
  GraphBuilderGraph,
  GraphBuilderHyperedge,
  GraphBuilderNode,
  GraphBuilderSemanticFragment
} from "./types.js";
import { normalizeLabel } from "./utils.js";

export function mergeSemanticFragment(
  graph: GraphBuilderGraph,
  fragment: GraphBuilderSemanticFragment
): GraphBuilderGraph {
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const edges = [...graph.edges];
  const edgeKeys = new Set(edges.map((edge) => edgeKey(edge)));
  const hyperedges = [...(graph.hyperedges ?? [])];
  const hyperedgeIds = new Set(hyperedges.map((hyperedge) => hyperedge.id));

  for (const node of fragment.nodes ?? []) {
    if (!node.id) {
      continue;
    }
    nodesById.set(node.id, normalizeNode(node));
  }

  for (const edge of fragment.edges ?? []) {
    if (!nodesById.has(edge.source) || !nodesById.has(edge.target)) {
      continue;
    }
    const normalized = normalizeEdge(edge);
    const key = edgeKey(normalized);
    if (edgeKeys.has(key)) {
      continue;
    }
    edges.push(normalized);
    edgeKeys.add(key);
  }

  for (const hyperedge of fragment.hyperedges ?? []) {
    if (!hyperedge.id || hyperedgeIds.has(hyperedge.id)) {
      continue;
    }
    const validNodes = hyperedge.nodes.filter((nodeId) => nodesById.has(nodeId));
    if (validNodes.length < 2) {
      continue;
    }
    hyperedges.push({
      ...hyperedge,
      label: sanitizeLabel(hyperedge.label),
      nodes: validNodes,
      metadata: hyperedge.metadata ? { ...hyperedge.metadata } : undefined
    });
    hyperedgeIds.add(hyperedge.id);
  }

  const nodes = [...nodesById.values()];

  return {
    ...graph,
    nodes,
    edges,
    hyperedges,
    stats: {
      ...graph.stats,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      sourceCount: new Set(nodes.map((node) => node.sourceItemId).filter(Boolean)).size
    }
  };
}

function normalizeNode(node: GraphBuilderNode): GraphBuilderNode {
  return {
    ...node,
    label: sanitizeLabel(node.label),
    normalizedLabel: normalizeLabel(node.label),
    metadata: node.metadata ? { ...node.metadata } : undefined
  };
}

function normalizeEdge(edge: GraphBuilderEdge): GraphBuilderEdge {
  return {
    ...edge,
    relation: sanitizeLabel(edge.relation),
    metadata: edge.metadata ? { ...edge.metadata } : undefined
  };
}

function edgeKey(edge: GraphBuilderEdge): string {
  return `${edge.source}:${edge.target}:${edge.relation}:${edge.sourceItemId ?? ""}`;
}