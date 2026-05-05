import type {
  GraphBuilderEdge,
  GraphBuilderExtraction,
  GraphBuilderNode,
  GraphBuilderProvider,
  GraphBuilderTextItem
} from "../core/types.js";
import { sanitizeLabel } from "../core/security.js";
import { slugify } from "../core/utils.js";

export interface GraphBuilderMemoryFactRecord {
  id: string;
  scope?: string;
  key: string;
  value: string;
  tags?: string[];
  factKind?: string;
  confidence?: number;
  obsolete?: boolean;
  lastUpdatedAt?: string;
  sourceTurn?: number;
  metadata?: Record<string, unknown>;
}

function normalizeTags(tags: string[] | null | undefined) {
  return [...new Set((tags ?? []).map((tag) => tag.trim().toLowerCase()).filter(Boolean))];
}

function createMemoryItemId(record: GraphBuilderMemoryFactRecord) {
  return record.id ?? ["memory", record.scope, record.key].filter(Boolean).join(":");
}

export function memoryFactToTextItem(record: GraphBuilderMemoryFactRecord): GraphBuilderTextItem {
  const tags = normalizeTags(record.tags);
  const itemId = createMemoryItemId(record);
  const factKind = record.factKind ?? "semantic";

  return {
    id: itemId,
    title: record.key,
    text: [
      `# ${record.key}`,
      record.value,
      tags.length > 0 ? `Tags: ${tags.join(", ")}` : null,
      `Kind: ${factKind}`
    ].filter(Boolean).join("\n\n"),
    sourceType: "memory_fact",
    updatedAt: record.lastUpdatedAt,
    metadata: {
      ...(record.metadata ?? {}),
      key: record.key,
      value: record.value,
      scope: record.scope,
      tags,
      factKind,
      confidence: record.confidence,
      obsolete: record.obsolete === true,
      sourceTurn: record.sourceTurn
    },
    storageRef: {
      provider: "memory",
      namespace: record.scope,
      physicalId: itemId,
      logicalPath: record.key,
      revision: record.lastUpdatedAt
    }
  };
}

export function createMemoryProvider(
  records: GraphBuilderMemoryFactRecord[]
): GraphBuilderProvider<GraphBuilderMemoryFactRecord> {
  return {
    name: "memory-facts",
    async *list() {
      for (const record of records) {
        yield record;
      }
    },
    async read(record) {
      return memoryFactToTextItem(record);
    }
  };
}

function nodeId(prefix: string, value: string) {
  return `${prefix}:${slugify(value)}`;
}

function addNode(nodes: GraphBuilderNode[], seen: Set<string>, node: GraphBuilderNode) {
  if (seen.has(node.id)) {
    return;
  }

  nodes.push(node);
  seen.add(node.id);
}

function createEdge(
  source: string,
  target: string,
  relation: string,
  item: GraphBuilderTextItem,
  metadata?: Record<string, unknown>
): GraphBuilderEdge {
  return {
    source,
    target,
    relation,
    confidence: "EXTRACTED",
    confidenceScore: 1,
    sourceItemId: item.id,
    context: "memory_fact",
    metadata
  };
}

function extractEntityRefs(value: string) {
  const refs: Array<{ type: string; label: string; relation: string; metadata?: Record<string, unknown> }> = [];

  for (const match of value.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)) {
    refs.push({ type: "email", label: match[0], relation: "mentions", metadata: { email: match[0] } });
  }

  for (const match of value.matchAll(/https?:\/\/[^\s)\]}]+/gi)) {
    refs.push({ type: "resource", label: match[0], relation: "links_to", metadata: { href: match[0] } });
  }

  for (const match of value.matchAll(/\b\d{4}-\d{2}-\d{2}\b/g)) {
    refs.push({ type: "date", label: match[0], relation: "mentions_date", metadata: { date: match[0] } });
  }

  for (const match of value.matchAll(/\/(?:workspace|organization)\/[^\s)\]}]+/g)) {
    refs.push({ type: "file_ref", label: match[0], relation: "references_file", metadata: { path: match[0] } });
  }

  for (const match of value.matchAll(/\b[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\b/g)) {
    if (match[0].includes("//")) {
      continue;
    }
    refs.push({ type: "repository", label: match[0], relation: "references_repository", metadata: { repository: match[0] } });
  }

  return refs;
}

export function extractMemoryFact(item: GraphBuilderTextItem): GraphBuilderExtraction {
  const metadata = item.metadata ?? {};
  const key = sanitizeLabel(String(metadata.key ?? item.title ?? item.id));
  const value = sanitizeLabel(String(metadata.value ?? item.text), 2_000);
  const tags = normalizeTags(Array.isArray(metadata.tags) ? metadata.tags.map(String) : []);
  const factKind = sanitizeLabel(String(metadata.factKind ?? "semantic"));
  const factNodeId = `fact:${item.id}`;
  const nodes: GraphBuilderNode[] = [];
  const edges: GraphBuilderEdge[] = [];
  const seenNodes = new Set<string>();

  addNode(nodes, seenNodes, {
    id: factNodeId,
    label: key,
    type: metadata.obsolete === true ? "obsolete_memory_fact" : "memory_fact",
    sourceItemId: item.id,
    storageRef: item.storageRef,
    metadata: {
      ...metadata,
      value,
      sourceType: item.sourceType ?? "memory_fact"
    }
  });

  const kindNodeId = nodeId("fact_kind", factKind);
  addNode(nodes, seenNodes, {
    id: kindNodeId,
    label: factKind,
    type: "fact_kind",
    metadata: { factKind }
  });
  edges.push(createEdge(factNodeId, kindNodeId, "classified_as", item));

  for (const tag of tags) {
    const tagNodeId = nodeId("tag", tag);
    addNode(nodes, seenNodes, {
      id: tagNodeId,
      label: tag,
      type: "tag",
      metadata: { tag }
    });
    edges.push(createEdge(factNodeId, tagNodeId, "tagged_with", item));
  }

  for (const ref of extractEntityRefs(`${key}\n${value}`)) {
    const refNodeId = nodeId(ref.type, ref.label);
    addNode(nodes, seenNodes, {
      id: refNodeId,
      label: ref.label,
      type: ref.type,
      metadata: ref.metadata
    });
    edges.push(createEdge(factNodeId, refNodeId, ref.relation, item, ref.metadata));
  }

  return {
    item,
    nodes,
    edges
  };
}

export function createMemoryExtractor() {
  return {
    name: "memory-fact",
    extract: extractMemoryFact
  };
}
