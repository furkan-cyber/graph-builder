import { analyzeGraph } from "./analyze.js";
import { buildArtifacts } from "./artifacts.js";
import { getCommunityNodes, getNeighbors, getNode, queryGraph, shortestPath } from "./query.js";
import { sanitizeSerializableValue } from "./security.js";
import type {
  GraphBuilderAnalysis,
  GraphBuilderArtifacts,
  GraphBuilderDiagnostics,
  GraphBuilderGraph,
  GraphBuilderIndex,
  GraphBuilderResult,
  SerializedGraphBuilderResult
} from "./types.js";

export function createGraphBuilderResult(
  graph: GraphBuilderGraph,
  diagnostics: GraphBuilderDiagnostics,
  artifacts = buildArtifacts(graph, analyzeGraph(graph))
): GraphBuilderResult {
  const sanitizedGraph = sanitizeSerializableValue(graph);
  const sanitizedDiagnostics = sanitizeSerializableValue(diagnostics);
  const sanitizedArtifacts = sanitizeSerializableValue(artifacts);
  const analysis = analyzeGraph(sanitizedGraph);
  const nextArtifacts = withDefaults(sanitizedArtifacts, buildArtifacts(sanitizedGraph, analysis));
  const index = createIndex(sanitizedGraph);

  return {
    graph: sanitizedGraph,
    index,
    analysis,
    artifacts: nextArtifacts,
    diagnostics: sanitizedDiagnostics,
    query: {
      getNode: (query) => getNode(sanitizedGraph, query),
      query: (question, options) => queryGraph(sanitizedGraph, question, options),
      path: (source, target) => shortestPath(sanitizedGraph, source, target),
      neighbors: (node) => getNeighbors(sanitizedGraph, node),
      community: (id) => getCommunityNodes(sanitizedGraph, id),
      timeline: (sourceItemId) => sourceItemId
        ? (sanitizedGraph.timeline ?? []).filter((entry) => entry.sourceItemId === sourceItemId)
        : sanitizedGraph.timeline ?? [],
      changes: () => sanitizedGraph.changes
    },
    toJSON() {
      return {
        graph: sanitizedGraph,
        analysis,
        artifacts: nextArtifacts,
        diagnostics: sanitizedDiagnostics
      };
    }
  };
}

export function loadGraphBuilderResult(
  input: string | GraphBuilderGraph | SerializedGraphBuilderResult
): GraphBuilderResult {
  const parsed = typeof input === "string" ? (JSON.parse(input) as GraphBuilderGraph | SerializedGraphBuilderResult) : input;
  if ("graph" in parsed && "analysis" in parsed && "diagnostics" in parsed) {
    return createGraphBuilderResult(parsed.graph, parsed.diagnostics, parsed.artifacts);
  }

  return createGraphBuilderResult(parsed, {
    warnings: [],
    skippedItems: [],
    errors: [],
    timings: {},
    modelUsage: []
  });
}

function createIndex(graph: GraphBuilderGraph): GraphBuilderIndex {
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const edgesByNodeId = new Map<string, typeof graph.edges>();
  const nodesBySourceItemId = new Map<string, typeof graph.nodes>();

  for (const edge of graph.edges) {
    edgesByNodeId.set(edge.source, [...(edgesByNodeId.get(edge.source) ?? []), edge]);
    edgesByNodeId.set(edge.target, [...(edgesByNodeId.get(edge.target) ?? []), edge]);
  }

  for (const node of graph.nodes) {
    if (!node.sourceItemId) {
      continue;
    }
    nodesBySourceItemId.set(node.sourceItemId, [...(nodesBySourceItemId.get(node.sourceItemId) ?? []), node]);
  }

  return {
    nodesById,
    edgesByNodeId,
    nodesBySourceItemId
  };
}

function withDefaults(artifacts: GraphBuilderArtifacts, fallback: GraphBuilderArtifacts): GraphBuilderArtifacts {
  return {
    json: artifacts.json ?? fallback.json,
    report: artifacts.report ?? fallback.report,
    wiki: artifacts.wiki ?? fallback.wiki,
    html: artifacts.html ?? fallback.html,
    timeline: artifacts.timeline ?? fallback.timeline,
    manifest: artifacts.manifest ?? fallback.manifest,
    dot: artifacts.dot ?? fallback.dot,
    graphml: artifacts.graphml ?? fallback.graphml,
    cypher: artifacts.cypher ?? fallback.cypher
  };
}