import type {
  GraphBuilderAnalysis,
  GraphBuilderArtifactKind,
  GraphBuilderArtifacts,
  GraphBuilderGraph
} from "./types.js";

export function buildArtifacts(
  graph: GraphBuilderGraph,
  analysis: GraphBuilderAnalysis,
  artifacts: GraphBuilderArtifactKind[] = ["json", "report"]
): GraphBuilderArtifacts {
  const nextArtifacts: GraphBuilderArtifacts = {};

  if (artifacts.includes("json")) {
    nextArtifacts.json = serializeGraph(graph);
  }
  if (artifacts.includes("report")) {
    nextArtifacts.report = generateReport(graph, analysis);
  }
  if (artifacts.includes("wiki")) {
    nextArtifacts.wiki = generateWiki(graph, analysis);
  }
  if (artifacts.includes("html")) {
    nextArtifacts.html = generateHtml(graph);
  }
  if (artifacts.includes("timeline")) {
    nextArtifacts.timeline = generateTimeline(graph);
  }
  if (artifacts.includes("manifest")) {
    nextArtifacts.manifest = generateManifest(graph);
  }
  if (artifacts.includes("dot")) {
    nextArtifacts.dot = generateDot(graph);
  }
  if (artifacts.includes("graphml")) {
    nextArtifacts.graphml = generateGraphML(graph);
  }
  if (artifacts.includes("cypher")) {
    nextArtifacts.cypher = generateCypher(graph);
  }

  return nextArtifacts;
}

export function serializeGraph(graph: GraphBuilderGraph, spaces = 2): string {
  return JSON.stringify(graph, null, spaces);
}

export function generateReport(graph: GraphBuilderGraph, analysis: GraphBuilderAnalysis): string {
  const lines = [
    `# Graph Builder Report`,
    "",
    `- ${graph.stats.nodeCount} nodes`,
    `- ${graph.stats.edgeCount} edges`,
    `- ${analysis.communities.length} communities`,
    `- ${(graph.timeline ?? []).length} timeline events`,
    "",
    "## God Nodes"
  ];

  for (const node of analysis.godNodes) {
    lines.push(`- ${node.label} (${node.degree})`);
  }

  lines.push("", "## Confidence Breakdown");
  for (const [confidence, count] of Object.entries(analysis.confidenceBreakdown)) {
    lines.push(`- ${confidence}: ${count}`);
  }

  lines.push("", "## Surprising Connections");
  if (analysis.surprisingConnections.length === 0) {
    lines.push("- None");
  } else {
    for (const connection of analysis.surprisingConnections) {
      lines.push(`- ${connection.source} --${connection.relation}--> ${connection.target} [${connection.confidence}]`);
      lines.push(`  ${connection.reason}`);
    }
  }

  lines.push("", "## Communities");
  for (const community of analysis.communities) {
    lines.push(`- ${community.label} (${community.size} nodes)`);
  }

  if (graph.changes) {
    lines.push("", "## Latest Change Set");
    lines.push(`- Added nodes: ${graph.changes.summary.addedNodeCount}`);
    lines.push(`- Removed nodes: ${graph.changes.summary.removedNodeCount}`);
    lines.push(`- Changed nodes: ${graph.changes.summary.changedNodeCount}`);
    lines.push(`- Added edges: ${graph.changes.summary.addedEdgeCount}`);
    lines.push(`- Removed edges: ${graph.changes.summary.removedEdgeCount}`);
    lines.push(`- Changed sources: ${graph.changes.summary.changedSourceCount}`);
  }

  return lines.join("\n");
}

export function generateTimeline(graph: GraphBuilderGraph): string {
  return JSON.stringify({
    createdAt: graph.createdAt,
    updatedAt: graph.updatedAt,
    snapshots: graph.snapshots ?? [],
    timeline: graph.timeline ?? [],
    latestChanges: graph.changes
  }, null, 2);
}

export function generateManifest(graph: GraphBuilderGraph): string {
  const sources = new Map<string, { sourceItemId: string; nodeCount: number; labels: string[]; hash?: string; updatedAt?: string }>();

  for (const node of graph.nodes) {
    if (!node.sourceItemId) {
      continue;
    }
    const current = sources.get(node.sourceItemId) ?? {
      sourceItemId: node.sourceItemId,
      nodeCount: 0,
      labels: [],
      hash: typeof node.metadata?.hash === "string" ? node.metadata.hash : undefined,
      updatedAt: typeof node.metadata?.updatedAt === "string" ? node.metadata.updatedAt : undefined
    };
    current.nodeCount += 1;
    if (current.labels.length < 8) {
      current.labels.push(node.label);
    }
    sources.set(node.sourceItemId, current);
  }

  return JSON.stringify({
    version: graph.version,
    createdAt: graph.createdAt,
    updatedAt: graph.updatedAt,
    stats: graph.stats,
    sources: [...sources.values()].sort((left, right) => left.sourceItemId.localeCompare(right.sourceItemId))
  }, null, 2);
}

export function generateDot(graph: GraphBuilderGraph): string {
  const lines = ["digraph GraphBuilder {", "  graph [rankdir=LR];", "  node [shape=box];"];
  for (const node of graph.nodes) {
    lines.push(`  ${dotId(node.id)} [label=${JSON.stringify(node.label)}];`);
  }
  for (const edge of graph.edges) {
    lines.push(`  ${dotId(edge.source)} -> ${dotId(edge.target)} [label=${JSON.stringify(edge.relation)}];`);
  }
  lines.push("}");
  return lines.join("\n");
}

export function generateGraphML(graph: GraphBuilderGraph): string {
  const lines = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<graphml xmlns="http://graphml.graphdrawing.org/xmlns">`,
    `  <graph id="GraphBuilder" edgedefault="directed">`
  ];
  for (const node of graph.nodes) {
    lines.push(`    <node id="${escapeXml(node.id)}"><data key="label">${escapeXml(node.label)}</data><data key="type">${escapeXml(node.type)}</data></node>`);
  }
  graph.edges.forEach((edge, index) => {
    lines.push(`    <edge id="e${index}" source="${escapeXml(edge.source)}" target="${escapeXml(edge.target)}"><data key="relation">${escapeXml(edge.relation)}</data><data key="confidence">${escapeXml(edge.confidence)}</data></edge>`);
  });
  lines.push("  </graph>", "</graphml>");
  return lines.join("\n");
}

export function generateCypher(graph: GraphBuilderGraph): string {
  const lines = ["// Graph Builder Cypher export"];
  for (const node of graph.nodes) {
    lines.push(`MERGE (n:GraphBuilderNode {id: ${cypherString(node.id)}}) SET n.label = ${cypherString(node.label)}, n.type = ${cypherString(node.type)};`);
  }
  for (const edge of graph.edges) {
    const relation = edge.relation.replace(/[^A-Za-z0-9_]/g, "_").toUpperCase() || "RELATED_TO";
    lines.push(`MATCH (a:GraphBuilderNode {id: ${cypherString(edge.source)}}), (b:GraphBuilderNode {id: ${cypherString(edge.target)}}) MERGE (a)-[:${relation} {confidence: ${cypherString(edge.confidence)}}]->(b);`);
  }
  return lines.join("\n");
}

export function generateWiki(graph: GraphBuilderGraph, analysis: GraphBuilderAnalysis): Record<string, string> {
  const wiki: Record<string, string> = {
    "index.md": [
      "# Graph Builder Wiki",
      "",
      `- Nodes: ${graph.stats.nodeCount}`,
      `- Edges: ${graph.stats.edgeCount}`,
      "",
      "## Communities",
      ...analysis.communities.map((community) => `- [[community-${community.id}.md|${community.label}]]`)
    ].join("\n")
  };

  for (const community of analysis.communities) {
    const members = graph.nodes.filter((node) => community.nodeIds.includes(node.id));
    wiki[`community-${community.id}.md`] = [
      `# ${community.label}`,
      "",
      ...members.slice(0, 25).map((member) => `- ${member.label} (${member.type})`)
    ].join("\n");
  }

  return wiki;
}

export function generateHtml(graph: GraphBuilderGraph): string {
  const nodes = graph.nodes.map((node) => ({
    id: node.id,
    label: node.label,
    group: node.community ?? node.type,
    title: `${node.label}\n${node.type}${node.metadata?.path ? `\n${String(node.metadata.path)}` : ""}`
  }));
  const edges = graph.edges.map((edge, index) => ({
    id: `${edge.source}-${edge.target}-${index}`,
    from: edge.source,
    to: edge.target,
    label: edge.relation,
    title: `${edge.relation} [${edge.confidence}]`,
    arrows: "to"
  }));

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Graph Builder</title>
    <script src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script>
    <style>
      body { margin: 0; font-family: ui-sans-serif, system-ui, sans-serif; background: #07111f; color: #e5edf8; }
      #app { display: grid; grid-template-columns: 320px 1fr; min-height: 100vh; }
      #sidebar { border-right: 1px solid #1f3550; padding: 16px; background: linear-gradient(180deg, #0b1727 0%, #08111d 100%); }
      #graph { height: 100vh; }
      h1 { margin: 0 0 12px; font-size: 18px; }
      .meta { color: #9ab0c9; font-size: 13px; margin-bottom: 16px; line-height: 1.5; }
      #search { width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid #29476a; background: #08111d; color: #e5edf8; }
      #results { margin-top: 12px; display: grid; gap: 8px; max-height: calc(100vh - 180px); overflow: auto; }
      .result { border: 1px solid #1f3550; background: rgba(12, 27, 45, 0.85); border-radius: 10px; padding: 10px 12px; cursor: pointer; }
      .result:hover { border-color: #4da3ff; }
      .label { font-size: 14px; font-weight: 600; }
      .subtle { font-size: 12px; color: #9ab0c9; margin-top: 4px; }
    </style>
  </head>
  <body>
    <div id="app">
      <aside id="sidebar">
        <h1>Graph Builder</h1>
        <div class="meta">${graph.stats.nodeCount} nodes · ${graph.stats.edgeCount} edges · ${graph.stats.communityCount} communities · ${(graph.timeline ?? []).length} events</div>
        <input id="search" placeholder="Search nodes" />
        <div id="results"></div>
      </aside>
      <main id="graph"></main>
    </div>
    <script>
      const rawNodes = ${JSON.stringify(nodes)};
      const rawEdges = ${JSON.stringify(edges)};
      const nodes = new vis.DataSet(rawNodes);
      const edges = new vis.DataSet(rawEdges);
      const network = new vis.Network(document.getElementById("graph"), { nodes, edges }, {
        autoResize: true,
        physics: {
          stabilization: { iterations: 180 },
          solver: "forceAtlas2Based",
          forceAtlas2Based: { gravitationalConstant: -35, springLength: 120, springConstant: 0.04 }
        },
        interaction: { hover: true },
        nodes: { shape: "dot", size: 18, font: { color: "#e5edf8", face: "ui-sans-serif" }, borderWidth: 1 },
        edges: { color: { color: "#5d83b3", highlight: "#7fd1ff" }, font: { align: "top", color: "#9ab0c9", size: 11 }, smooth: true }
      });

      const search = document.getElementById("search");
      const results = document.getElementById("results");

      function renderResults(query) {
        results.innerHTML = "";
        if (!query) {
          return;
        }
        const normalized = query.toLowerCase();
        rawNodes.filter((node) => node.label.toLowerCase().includes(normalized)).slice(0, 40).forEach((node) => {
          const el = document.createElement("button");
          el.className = "result";
          el.innerHTML = '<div class="label">' + escapeHtml(node.label) + '</div><div class="subtle">' + escapeHtml(String(node.group)) + '</div>';
          el.addEventListener("click", () => {
            network.selectNodes([node.id]);
            network.focus(node.id, { scale: 1.15, animation: true });
          });
          results.appendChild(el);
        });
      }

      function escapeHtml(text) {
        return String(text)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\"/g, "&quot;")
          .replace(/'/g, "&#39;");
      }

      search.addEventListener("input", (event) => renderResults(event.target.value));
    </script>
  </body>
</html>`;
}

function dotId(value: string): string {
  return JSON.stringify(value.replace(/[^A-Za-z0-9_]/g, "_"));
}

function escapeXml(value: unknown): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function cypherString(value: string): string {
  return JSON.stringify(value);
}