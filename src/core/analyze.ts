import type {
  GraphBuilderAnalysis,
  GraphBuilderConfidence,
  GraphBuilderGraph,
  GraphBuilderNode
} from "./types.js";
import { buildAdjacency } from "./query.js";

export function analyzeGraph(graph: GraphBuilderGraph, topN = 10): GraphBuilderAnalysis {
  const adjacency = buildAdjacency(graph);
  const communities = assignCommunities(graph, adjacency);
  graph.stats.communityCount = communities.length;

  const degrees = new Map<string, number>(graph.nodes.map((node) => [node.id, adjacency.get(node.id)?.length ?? 0]));

  const godNodes = [...graph.nodes]
    .filter((node) => !["tag", "resource"].includes(node.type))
    .sort((left, right) => (degrees.get(right.id) ?? 0) - (degrees.get(left.id) ?? 0))
    .slice(0, topN)
    .map((node) => ({
      id: node.id,
      label: node.label,
      degree: degrees.get(node.id) ?? 0
    }));

  const confidenceBreakdown: Record<GraphBuilderConfidence, number> = {
    EXTRACTED: 0,
    INFERRED: 0,
    AMBIGUOUS: 0
  };
  for (const edge of graph.edges) {
    confidenceBreakdown[edge.confidence] += 1;
  }

  const isolatedNodes = graph.nodes.filter((node) => (degrees.get(node.id) ?? 0) <= 1 && !["tag", "resource"].includes(node.type));

  const nodeMap = new Map(graph.nodes.map((node) => [node.id, node]));
  const surprisingConnections = [...graph.edges]
    .filter((edge) => {
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);
      return source?.sourceItemId && target?.sourceItemId && source.sourceItemId !== target.sourceItemId;
    })
    .sort((left, right) => scoreSurprise(right) - scoreSurprise(left))
    .slice(0, 5)
    .map((edge) => ({
      source: nodeMap.get(edge.source)?.label ?? edge.source,
      target: nodeMap.get(edge.target)?.label ?? edge.target,
      relation: edge.relation,
      confidence: edge.confidence,
      reason: edge.confidence === "INFERRED" ? "Cross-source inferred reference" : "Cross-source structural connection"
    }));

  return {
    godNodes,
    confidenceBreakdown,
    isolatedNodes,
    surprisingConnections,
    communities
  };
}

function assignCommunities(graph: GraphBuilderGraph, adjacency: Map<string, unknown[]>): GraphBuilderAnalysis["communities"] {
  const visited = new Set<string>();
  const groups: string[][] = [];

  for (const node of graph.nodes) {
    if (visited.has(node.id)) {
      continue;
    }
    const component: string[] = [];
    const stack = [node.id];
    visited.add(node.id);
    while (stack.length > 0) {
      const current = stack.pop()!;
      component.push(current);
      for (const edge of adjacency.get(current) ?? []) {
        const typedEdge = edge as { source: string; target: string };
        const neighbor = typedEdge.source === current ? typedEdge.target : typedEdge.source;
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          stack.push(neighbor);
        }
      }
    }
    groups.push(component);
  }

  groups.sort((left, right) => right.length - left.length);
  const communities = groups.map((nodeIds, index) => ({
    id: index,
    label: labelCommunity(nodeIds, graph.nodes),
    size: nodeIds.length,
    nodeIds
  }));

  const communityMap = new Map<string, number>();
  for (const community of communities) {
    for (const nodeId of community.nodeIds) {
      communityMap.set(nodeId, community.id);
    }
  }

  graph.nodes = graph.nodes.map((node) => ({
    ...node,
    community: communityMap.get(node.id)
  }));

  return communities;
}

function labelCommunity(nodeIds: string[], nodes: GraphBuilderNode[]): string {
  const members = nodes.filter((node) => nodeIds.includes(node.id) && !["tag", "resource"].includes(node.type));
  return members[0]?.label ?? "Community";
}

function scoreSurprise(edge: { confidence: GraphBuilderConfidence; relation: string }): number {
  const base = edge.confidence === "AMBIGUOUS" ? 3 : edge.confidence === "INFERRED" ? 2 : 1;
  return base + (edge.relation === "references" ? 1 : 0);
}