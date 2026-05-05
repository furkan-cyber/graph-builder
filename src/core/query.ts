import type {
  GraphBuilderEdge,
  GraphBuilderGraph,
  GraphBuilderNeighbor,
  GraphBuilderNode,
  GraphBuilderPathResult,
  GraphBuilderQueryResult
} from "./types.js";
import { normalizeLabel } from "./utils.js";

export function buildAdjacency(graph: GraphBuilderGraph): Map<string, GraphBuilderEdge[]> {
  const adjacency = new Map<string, GraphBuilderEdge[]>();
  for (const edge of graph.edges) {
    adjacency.set(edge.source, [...(adjacency.get(edge.source) ?? []), edge]);
    adjacency.set(edge.target, [...(adjacency.get(edge.target) ?? []), edge]);
  }
  return adjacency;
}

export function getNode(graph: GraphBuilderGraph, query: string): GraphBuilderNode | undefined {
  return scoreNodes(graph, query)[0]?.node;
}

export function queryGraph(
  graph: GraphBuilderGraph,
  question: string,
  options: { depth?: number; maxSeeds?: number } = {}
): GraphBuilderQueryResult {
  const depth = options.depth ?? 2;
  const maxSeeds = options.maxSeeds ?? 3;
  const seeds = scoreNodes(graph, question).slice(0, maxSeeds).map((entry) => entry.node);
  if (seeds.length === 0) {
    return { question, seeds: [], nodes: [], edges: [] };
  }

  const adjacency = buildAdjacency(graph);
  const visited = new Set<string>(seeds.map((seed) => seed.id));
  const edges: GraphBuilderEdge[] = [];
  let frontier = seeds.map((seed) => seed.id);

  for (let currentDepth = 0; currentDepth < depth; currentDepth += 1) {
    const nextFrontier: string[] = [];
    for (const nodeId of frontier) {
      for (const edge of adjacency.get(nodeId) ?? []) {
        edges.push(edge);
        const neighbor = edge.source === nodeId ? edge.target : edge.source;
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          nextFrontier.push(neighbor);
        }
      }
    }
    frontier = nextFrontier;
  }

  const nodeMap = new Map(graph.nodes.map((node) => [node.id, node]));
  return {
    question,
    seeds,
    nodes: [...visited].map((id) => nodeMap.get(id)).filter((value): value is GraphBuilderNode => Boolean(value)),
    edges: dedupeEdges(edges)
  };
}

export function shortestPath(
  graph: GraphBuilderGraph,
  sourceQuery: string,
  targetQuery: string
): GraphBuilderPathResult | null {
  const source = getNode(graph, sourceQuery);
  const target = getNode(graph, targetQuery);

  if (!source || !target) {
    return null;
  }

  const adjacency = buildAdjacency(graph);
  const queue: string[] = [source.id];
  const visited = new Set<string>([source.id]);
  const parentNode = new Map<string, string>();
  const parentEdge = new Map<string, GraphBuilderEdge>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === target.id) {
      break;
    }
    for (const edge of adjacency.get(current) ?? []) {
      const neighbor = edge.source === current ? edge.target : edge.source;
      if (visited.has(neighbor)) {
        continue;
      }
      visited.add(neighbor);
      parentNode.set(neighbor, current);
      parentEdge.set(neighbor, edge);
      queue.push(neighbor);
    }
  }

  if (!visited.has(target.id)) {
    return null;
  }

  const nodeMap = new Map(graph.nodes.map((node) => [node.id, node]));
  const nodeIds: string[] = [];
  const edges: GraphBuilderEdge[] = [];
  let current = target.id;

  while (current !== source.id) {
    nodeIds.push(current);
    const edge = parentEdge.get(current);
    const previous = parentNode.get(current);
    if (!edge || !previous) {
      break;
    }
    edges.push(edge);
    current = previous;
  }
  nodeIds.push(source.id);

  return {
    nodes: nodeIds.reverse().map((id) => nodeMap.get(id)).filter((value): value is GraphBuilderNode => Boolean(value)),
    edges: edges.reverse()
  };
}

export function getNeighbors(graph: GraphBuilderGraph, nodeQuery: string): GraphBuilderNeighbor[] {
  const node = getNode(graph, nodeQuery);
  if (!node) {
    return [];
  }
  const nodeMap = new Map(graph.nodes.map((entry) => [entry.id, entry]));
  const adjacency = buildAdjacency(graph);

  return (adjacency.get(node.id) ?? []).map((edge) => {
    const outgoing = edge.source === node.id;
    const neighborId = outgoing ? edge.target : edge.source;
    return {
      node: nodeMap.get(neighborId)!,
      edge,
      direction: outgoing ? "outgoing" : "incoming"
    };
  });
}

export function getCommunityNodes(graph: GraphBuilderGraph, id: number): GraphBuilderNode[] {
  return graph.nodes.filter((node) => node.community === id);
}

function scoreNodes(graph: GraphBuilderGraph, query: string): Array<{ node: GraphBuilderNode; score: number }> {
  const terms = normalizeLabel(query).split(/\s+/).filter(Boolean);
  return graph.nodes
    .map((node) => {
      const label = node.normalizedLabel ?? normalizeLabel(node.label);
      const path = typeof node.metadata?.path === "string" ? normalizeLabel(node.metadata.path) : "";
      const score = terms.reduce((accumulator, term) => {
        let next = accumulator;
        if (label === term) {
          next += 100;
        }
        if (label.includes(term)) {
          next += 10;
        }
        if (path.includes(term)) {
          next += 5;
        }
        return next;
      }, 0);
      return { node, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);
}

function dedupeEdges(edges: GraphBuilderEdge[]): GraphBuilderEdge[] {
  const seen = new Set<string>();
  const result: GraphBuilderEdge[] = [];
  for (const edge of edges) {
    const key = `${edge.source}:${edge.target}:${edge.relation}:${edge.sourceItemId ?? ""}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(edge);
    }
  }
  return result;
}