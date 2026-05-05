import type {
  GraphBuilderHyperedge,
  GraphBuilderModelUsage,
  GraphBuilderNode,
  GraphBuilderSemanticContext,
  GraphBuilderSemanticEnricher,
  GraphBuilderSemanticFragment
} from "../core/types.js";

export interface OpenAICompatibleEnricherOptions {
  apiKey: string;
  model: string;
  baseUrl?: string;
  maxItems?: number;
  maxCharsPerItem?: number;
  maxContextNodes?: number;
  temperature?: number;
  fetchImpl?: typeof fetch;
}

const DEFAULT_SYSTEM_PROMPT = [
  "You are a Graph Builder semantic enrichment agent.",
  "You receive text items plus an existing deterministic graph.",
  "Return ONLY valid JSON. Add only genuinely useful semantic concepts or semantic edges.",
  "Prefer linking existing node ids instead of inventing duplicates.",
  "Do not repeat deterministic contains/imports edges.",
  "Use confidence EXTRACTED only for explicit statements. Use INFERRED for semantic links.",
  "If there is no useful enrichment, return empty arrays.",
  "Schema:",
  '{"nodes":[{"id":"concept_shared_context","label":"Shared Context","type":"concept","sourceItemId":"optional","metadata":{}}],"edges":[{"source":"existing_or_new_node_id","target":"existing_or_new_node_id","relation":"semantically_similar_to|supports|depends_on|rationale_for","confidence":"EXTRACTED|INFERRED|AMBIGUOUS","confidenceScore":0.85,"sourceItemId":"optional","context":"semantic_llm","metadata":{"reason":"short reason"}}],"hyperedges":[{"id":"shared_context","label":"Shared Context","nodes":["node1","node2"],"metadata":{"reason":"short reason"}}]}'
].join("\n");

export function createOpenAICompatibleEnricher(options: OpenAICompatibleEnricherOptions): GraphBuilderSemanticEnricher {
  return {
    name: "openai-compatible",
    async enrich(context) {
      const fetchImpl = options.fetchImpl ?? globalThis.fetch;
      if (typeof fetchImpl !== "function") {
        throw new Error("fetch is not available in this runtime. Provide fetchImpl to the enricher.");
      }

      const response = await fetchImpl(resolveUrl(options.baseUrl), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${options.apiKey}`
        },
        body: JSON.stringify({
          model: options.model,
          temperature: options.temperature ?? 0,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: DEFAULT_SYSTEM_PROMPT },
            { role: "user", content: buildUserPrompt(context, options) }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`LLM request failed with ${response.status} ${response.statusText}`);
      }

      const payload = (await response.json()) as Record<string, any>;
      const content = payload.choices?.[0]?.message?.content;
      const parsed = parseFragment(content);

      return {
        ...parsed,
        usage: parseUsage(payload.usage, options.model)
      };
    }
  };
}

function buildUserPrompt(context: GraphBuilderSemanticContext, options: OpenAICompatibleEnricherOptions): string {
  const maxItems = options.maxItems ?? 8;
  const maxCharsPerItem = options.maxCharsPerItem ?? 2500;
  const maxContextNodes = options.maxContextNodes ?? 120;

  return JSON.stringify({
    task: "Enrich the graph with semantic relationships only.",
    items: context.items.slice(0, maxItems).map((item) => ({
      id: item.id,
      title: item.title,
      path: item.path,
      text: item.text.slice(0, maxCharsPerItem)
    })),
    existingNodes: context.graph.nodes
      .filter((node) => !["tag", "resource", "package"].includes(node.type))
      .slice(0, maxContextNodes)
      .map((node) => ({
        id: node.id,
        label: node.label,
        type: node.type,
        sourceItemId: node.sourceItemId
      }))
  }, null, 2);
}

function parseFragment(content: unknown): GraphBuilderSemanticFragment {
  if (typeof content !== "string") {
    return { nodes: [], edges: [], hyperedges: [], warnings: ["LLM returned empty content."] };
  }

  let parsed: Record<string, any>;
  try {
    parsed = JSON.parse(stripCodeFences(content));
  } catch {
    return { nodes: [], edges: [], hyperedges: [], warnings: ["LLM returned invalid JSON."] };
  }

  return {
    nodes: Array.isArray(parsed.nodes) ? parsed.nodes.map(normalizeNode) : [],
    edges: Array.isArray(parsed.edges) ? parsed.edges.map(normalizeEdge) : [],
    hyperedges: Array.isArray(parsed.hyperedges) ? parsed.hyperedges.map(normalizeHyperedge) : [],
    warnings: []
  };
}

function normalizeNode(node: Record<string, any>): GraphBuilderNode {
  return {
    id: String(node.id ?? ""),
    label: String(node.label ?? node.id ?? ""),
    type: String(node.type ?? "concept"),
    sourceItemId: typeof node.sourceItemId === "string" ? node.sourceItemId : undefined,
    sourceLocation: typeof node.sourceLocation === "string" ? node.sourceLocation : undefined,
    sourceUrl: typeof node.sourceUrl === "string" ? node.sourceUrl : undefined,
    metadata: typeof node.metadata === "object" && node.metadata !== null ? node.metadata : undefined
  };
}

function normalizeEdge(edge: Record<string, any>) {
  return {
    source: String(edge.source ?? ""),
    target: String(edge.target ?? ""),
    relation: String(edge.relation ?? "semantic_relation"),
    confidence: edge.confidence === "EXTRACTED" || edge.confidence === "AMBIGUOUS" ? edge.confidence : "INFERRED",
    confidenceScore: typeof edge.confidenceScore === "number" ? edge.confidenceScore : undefined,
    sourceItemId: typeof edge.sourceItemId === "string" ? edge.sourceItemId : undefined,
    sourceLocation: typeof edge.sourceLocation === "string" ? edge.sourceLocation : undefined,
    context: typeof edge.context === "string" ? edge.context : "semantic_llm",
    metadata: typeof edge.metadata === "object" && edge.metadata !== null ? edge.metadata : undefined
  };
}

function normalizeHyperedge(hyperedge: Record<string, any>): GraphBuilderHyperedge {
  return {
    id: String(hyperedge.id ?? ""),
    label: String(hyperedge.label ?? hyperedge.id ?? ""),
    nodes: Array.isArray(hyperedge.nodes) ? hyperedge.nodes.map((nodeId) => String(nodeId)) : [],
    metadata: typeof hyperedge.metadata === "object" && hyperedge.metadata !== null ? hyperedge.metadata : undefined
  };
}

function parseUsage(usage: Record<string, any> | undefined, model: string): GraphBuilderModelUsage {
  return {
    provider: "openai-compatible",
    model,
    inputTokens: typeof usage?.prompt_tokens === "number" ? usage.prompt_tokens : undefined,
    outputTokens: typeof usage?.completion_tokens === "number" ? usage.completion_tokens : undefined
  };
}

function stripCodeFences(content: string): string {
  if (!content.startsWith("```")) {
    return content.trim();
  }
  return content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}

function resolveUrl(baseUrl = "https://api.openai.com/v1"): string {
  return `${baseUrl.replace(/\/$/, "")}/chat/completions`;
}