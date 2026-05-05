import matter from "gray-matter";
import { toString } from "mdast-util-to-string";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import ts from "typescript";
import type { Node } from "unist";
import { visit } from "unist-util-visit";
import { sanitizeLabel } from "./security.js";
import type {
  GraphBuilderEdge,
  GraphBuilderExtraction,
  GraphBuilderNode,
  GraphBuilderTextItem
} from "./types.js";
import { extensionOf, inferTitle, locationLabel, normalizePath, resolveRelativePath, slugify } from "./utils.js";

const processor = remark().use(remarkParse).use(remarkGfm);
const CODE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts"]);
const STRUCTURED_EXTENSIONS = new Set([".json", ".yml", ".yaml"]);
const SYMBOL_PATTERN = /(?:export\s+)?(?:async\s+)?(?:function|class|interface|type|const|let|var)\s+([A-Za-z_$][\w$]*)/g;
const IMPORT_PATTERNS = [
  /(?:import|export)\s+(?:type\s+)?(?:[^;]*?)\s+from\s+["']([^"']+)["']/g,
  /import\s+["']([^"']+)["']/g,
  /require\(\s*["']([^"']+)["']\s*\)/g,
  /import\(\s*["']([^"']+)["']\s*\)/g
];

export async function extractText(item: GraphBuilderTextItem): Promise<GraphBuilderExtraction> {
  if (CODE_EXTENSIONS.has(extensionOf(item.path))) {
    return extractCode(item);
  }
  if (STRUCTURED_EXTENSIONS.has(extensionOf(item.path))) {
    return extractStructuredData(item);
  }
  return extractMarkdown(item);
}

export async function extractMarkdown(item: GraphBuilderTextItem): Promise<GraphBuilderExtraction> {
  const parsed = matter(item.text);
  const frontmatter = parsed.data as Record<string, unknown>;
  const body = parsed.content;
  const documentId = `doc:${item.id}`;
  const documentNode = createDocumentNode(item, documentId, "document", frontmatter);

  const nodes: GraphBuilderNode[] = [documentNode];
  const edges: GraphBuilderEdge[] = [];
  const root = processor.parse(body) as { children?: Array<Node & Record<string, any>> };
  const headingStack: Array<{ depth: number; id: string }> = [];
  let headingIndex = 0;
  let chunkIndex = 0;

  const addTag = (ownerId: string, tag: string, line?: number) => {
    const value = sanitizeLabel(tag.replace(/^#/, ""));
    if (!value) {
      return;
    }
    const tagId = `tag:${slugify(value)}`;
    nodes.push({
      id: tagId,
      label: value,
      type: "tag",
      sourceItemId: item.id,
      metadata: { tag: value }
    });
    edges.push({
      source: ownerId,
      target: tagId,
      relation: "tagged_with",
      confidence: "EXTRACTED",
      sourceItemId: item.id,
      sourceLocation: locationLabel(line),
      context: "tag"
    });
  };

  const addLinks = (ownerId: string, node: Node) => {
    visit(node, "link", (linkNode) => {
      const typedNode = linkNode as Record<string, any>;
      const href = sanitizeLabel(typedNode.url ?? "");
      if (!href) {
        return;
      }
      const resourceId = `resource:${slugify(href)}`;
      nodes.push({
        id: resourceId,
        label: href,
        type: "resource",
        sourceItemId: item.id,
        metadata: { href }
      });
      edges.push({
        source: ownerId,
        target: resourceId,
        relation: "links_to",
        confidence: "EXTRACTED",
        sourceItemId: item.id,
        sourceLocation: locationLabel(typedNode.position?.start?.line),
        context: "markdown_link",
        metadata: { href }
      });
    });
  };

  for (const tag of normalizeTags(frontmatter.tags)) {
    addTag(documentId, tag);
  }

  for (const child of root.children ?? []) {
    if (child.type === "heading") {
      const label = sanitizeLabel(toString(child as never));
      if (!label) {
        continue;
      }
      const headingId = `${documentId}:heading:${headingIndex++}:${slugify(label)}`;
      while (headingStack.length && headingStack.at(-1)!.depth >= (child.depth ?? 1)) {
        headingStack.pop();
      }
      const parentId = headingStack.at(-1)?.id ?? documentId;
      nodes.push({
        id: headingId,
        label,
        type: "heading",
        sourceItemId: item.id,
        sourceLocation: locationLabel(child.position?.start?.line),
        metadata: {
          depth: child.depth ?? 1,
          path: normalizePath(item.path)
        }
      });
      edges.push({
        source: parentId,
        target: headingId,
        relation: "contains",
        confidence: "EXTRACTED",
        sourceItemId: item.id,
        sourceLocation: locationLabel(child.position?.start?.line),
        context: "heading"
      });
      addLinks(headingId, child);
      for (const tag of extractInlineTags(label)) {
        addTag(headingId, tag, child.position?.start?.line);
      }
      headingStack.push({ depth: child.depth ?? 1, id: headingId });
      continue;
    }

    const text = sanitizeLabel(toString(child as never));
    if (!text) {
      continue;
    }

    const parentId = headingStack.at(-1)?.id ?? documentId;
    const chunkId = `${documentId}:chunk:${chunkIndex++}`;
    nodes.push({
      id: chunkId,
      label: text.slice(0, 120),
      type: "chunk",
      sourceItemId: item.id,
      sourceLocation: locationLabel(child.position?.start?.line),
      metadata: {
        text,
        path: normalizePath(item.path),
        blockType: child.type
      }
    });
    edges.push({
      source: parentId,
      target: chunkId,
      relation: "contains",
      confidence: "EXTRACTED",
      sourceItemId: item.id,
      sourceLocation: locationLabel(child.position?.start?.line),
      context: child.type
    });
    addLinks(chunkId, child);
    for (const tag of extractInlineTags(text)) {
      addTag(chunkId, tag, child.position?.start?.line);
    }
  }

  if (item.parentId) {
    edges.push({
      source: `doc:${item.parentId}`,
      target: documentId,
      relation: "contains",
      confidence: "INFERRED",
      sourceItemId: item.id,
      context: "parent_id"
    });
  }

  return {
    item,
    nodes,
    edges
  };
}

async function extractCode(item: GraphBuilderTextItem): Promise<GraphBuilderExtraction> {
  return extractScriptCode(item);
}

function extractScriptCode(item: GraphBuilderTextItem): GraphBuilderExtraction {
  const documentId = `doc:${item.id}`;
  const documentNode = createDocumentNode(item, documentId, "code_file");
  const nodes: GraphBuilderNode[] = [documentNode];
  const edges: GraphBuilderEdge[] = [];
  const dependencyIds = new Set<string>();
  const symbolIds = new Set<string>();
  const symbolsByName = new Map<string, string[]>();
  const sourceFile = ts.createSourceFile(
    item.path ?? item.id,
    item.text,
    ts.ScriptTarget.Latest,
    true,
    scriptKindForPath(item.path ?? item.id)
  );

  const addSymbol = (label: string, type: string, node: ts.Node, ownerId = documentId) => {
    const cleanLabel = sanitizeLabel(label);
    if (!cleanLabel) {
      return undefined;
    }
    const symbolId = `${documentId}:symbol:${slugify(cleanLabel)}`;
    if (!symbolIds.has(symbolId)) {
      symbolIds.add(symbolId);
      nodes.push({
        id: symbolId,
        label: cleanLabel,
        type,
        sourceItemId: item.id,
        sourceLocation: locationLabel(lineForNode(sourceFile, node)),
        metadata: {
          path: normalizePath(item.path)
        }
      });
      edges.push({
        source: ownerId,
        target: symbolId,
        relation: "contains",
        confidence: "EXTRACTED",
        sourceItemId: item.id,
        sourceLocation: locationLabel(lineForNode(sourceFile, node)),
        context: "symbol"
      });
    }
    const simpleName = cleanLabel.split(".").at(-1) ?? cleanLabel;
    symbolsByName.set(simpleName, [...(symbolsByName.get(simpleName) ?? []), symbolId]);
    symbolsByName.set(cleanLabel, [...(symbolsByName.get(cleanLabel) ?? []), symbolId]);
    return symbolId;
  };

  const collectSymbols = (node: ts.Node, ownerId = documentId, ownerLabel?: string) => {
    if (ts.isFunctionDeclaration(node) && node.name) {
      addSymbol(node.name.text, "function", node, ownerId);
    } else if (ts.isClassDeclaration(node) && node.name) {
      const classId = addSymbol(node.name.text, "class", node, ownerId);
      if (classId) {
        for (const member of node.members) {
          collectSymbols(member, classId, node.name.text);
        }
      }
    } else if (ts.isInterfaceDeclaration(node)) {
      addSymbol(node.name.text, "interface", node, ownerId);
    } else if (ts.isTypeAliasDeclaration(node)) {
      addSymbol(node.name.text, "type", node, ownerId);
    } else if (ts.isEnumDeclaration(node)) {
      addSymbol(node.name.text, "enum", node, ownerId);
    } else if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name)) {
      addSymbol(ownerLabel ? `${ownerLabel}.${node.name.text}` : node.name.text, "method", node, ownerId);
    } else if (ts.isPropertyDeclaration(node) && ts.isIdentifier(node.name)) {
      addSymbol(ownerLabel ? `${ownerLabel}.${node.name.text}` : node.name.text, "property", node, ownerId);
    } else if (ts.isVariableStatement(node)) {
      for (const declaration of node.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) {
          const type = declaration.initializer && (ts.isArrowFunction(declaration.initializer) || ts.isFunctionExpression(declaration.initializer)) ? "function" : "symbol";
          addSymbol(declaration.name.text, type, declaration, ownerId);
        }
      }
    }

    if (!ts.isClassDeclaration(node)) {
      ts.forEachChild(node, (child) => collectSymbols(child, ownerId, ownerLabel));
    }
  };

  collectSymbols(sourceFile);

  const addDependency = (specifier: string, line: number) => {
    if (specifier.startsWith(".") || specifier.startsWith("@/")) {
      const resolved = resolveImportTarget(item.path, specifier);
      const resourceId = `resource:${slugify(resolved)}`;
      if (!dependencyIds.has(resourceId)) {
        nodes.push({
          id: resourceId,
          label: resolved,
          type: "resource",
          sourceItemId: item.id,
          metadata: { href: resolved }
        });
        dependencyIds.add(resourceId);
      }
      edges.push({
        source: documentId,
        target: resourceId,
        relation: "imports",
        confidence: "EXTRACTED",
        confidenceScore: 1,
        sourceItemId: item.id,
        sourceLocation: locationLabel(line),
        context: "import",
        metadata: { specifier }
      });
      return;
    }

    const packageId = `package:${slugify(specifier)}`;
    if (!dependencyIds.has(packageId)) {
      nodes.push({
        id: packageId,
        label: specifier,
        type: "package",
        sourceItemId: item.id,
        metadata: { package: specifier }
      });
      dependencyIds.add(packageId);
    }
    edges.push({
      source: documentId,
      target: packageId,
      relation: "imports_package",
      confidence: "EXTRACTED",
      confidenceScore: 1,
      sourceItemId: item.id,
      sourceLocation: locationLabel(line),
      context: "import",
      metadata: { specifier }
    });
  };

  const firstSymbolId = (name: string) => symbolsByName.get(name)?.[0];
  const visitRelations = (node: ts.Node, ownerSymbolId?: string) => {
    const nextOwner = symbolIdForDeclaration(node, documentId, sourceFile);

    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      addDependency(node.moduleSpecifier.text, lineForNode(sourceFile, node));
    }

    if (ts.isCallExpression(node) && ownerSymbolId) {
      const callee = calleeName(node.expression);
      const target = callee ? firstSymbolId(callee) : undefined;
      if (target && target !== ownerSymbolId) {
        edges.push({
          source: ownerSymbolId,
          target,
          relation: "calls",
          confidence: "EXTRACTED",
          confidenceScore: 1,
          sourceItemId: item.id,
          sourceLocation: locationLabel(lineForNode(sourceFile, node)),
          context: "call"
        });
      }
    }

    if ((ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)) && node.name && node.heritageClauses) {
      const source = firstSymbolId(node.name.text);
      if (source) {
        for (const clause of node.heritageClauses) {
          const relation = clause.token === ts.SyntaxKind.ExtendsKeyword ? "extends" : "implements";
          for (const type of clause.types) {
            const targetName = type.expression.getText(sourceFile).split(".").at(-1) ?? "";
            const target = firstSymbolId(targetName);
            if (target && target !== source) {
              edges.push({
                source,
                target,
                relation,
                confidence: "EXTRACTED",
                confidenceScore: 1,
                sourceItemId: item.id,
                sourceLocation: locationLabel(lineForNode(sourceFile, type)),
                context: "heritage"
              });
            }
          }
        }
      }
    }

    ts.forEachChild(node, (child) => visitRelations(child, nextOwner ?? ownerSymbolId));
  };

  visitRelations(sourceFile);

  return {
    item,
    nodes,
    edges
  };
}

function extractPatternCode(item: GraphBuilderTextItem): GraphBuilderExtraction {
  const documentId = `doc:${item.id}`;
  const nodes: GraphBuilderNode[] = [createDocumentNode(item, documentId, "code_file")];
  const edges: GraphBuilderEdge[] = [];
  const symbolIds = new Set<string>();
  const dependencyIds = new Set<string>();

  for (const match of item.text.matchAll(SYMBOL_PATTERN)) {
    const symbolName = sanitizeLabel(match[1]);
    if (!symbolName) {
      continue;
    }
    const symbolId = `${documentId}:symbol:${slugify(symbolName)}`;
    if (symbolIds.has(symbolId)) {
      continue;
    }
    symbolIds.add(symbolId);
    nodes.push({
      id: symbolId,
      label: symbolName,
      type: "symbol",
      sourceItemId: item.id,
      sourceLocation: locationLabel(getLineNumber(item.text, match.index ?? 0)),
      metadata: {
        path: normalizePath(item.path)
      }
    });
    edges.push({
      source: documentId,
      target: symbolId,
      relation: "contains",
      confidence: "EXTRACTED",
      sourceItemId: item.id,
      sourceLocation: locationLabel(getLineNumber(item.text, match.index ?? 0)),
      context: "symbol"
    });
  }

  for (const pattern of IMPORT_PATTERNS) {
    for (const match of item.text.matchAll(pattern)) {
      const specifier = sanitizeLabel(match[1]);
      if (!specifier) {
        continue;
      }
      const line = getLineNumber(item.text, match.index ?? 0);
      if (specifier.startsWith(".") || specifier.startsWith("@/")) {
        const resolved = resolveImportTarget(item.path, specifier);
        const resourceId = `resource:${slugify(resolved)}`;
        if (!dependencyIds.has(resourceId)) {
          nodes.push({
            id: resourceId,
            label: resolved,
            type: "resource",
            sourceItemId: item.id,
            metadata: { href: resolved }
          });
          dependencyIds.add(resourceId);
        }
        edges.push({
          source: documentId,
          target: resourceId,
          relation: "imports",
          confidence: "EXTRACTED",
          confidenceScore: 1,
          sourceItemId: item.id,
          sourceLocation: locationLabel(line),
          context: "import",
          metadata: { specifier }
        });
      } else {
        const packageId = `package:${slugify(specifier)}`;
        if (!dependencyIds.has(packageId)) {
          nodes.push({
            id: packageId,
            label: specifier,
            type: "package",
            sourceItemId: item.id,
            metadata: { package: specifier }
          });
          dependencyIds.add(packageId);
        }
        edges.push({
          source: documentId,
          target: packageId,
          relation: "imports_package",
          confidence: "EXTRACTED",
          confidenceScore: 1,
          sourceItemId: item.id,
          sourceLocation: locationLabel(line),
          context: "import",
          metadata: { specifier }
        });
      }
    }
  }

  return {
    item,
    nodes,
    edges
  };
}

function extractStructuredData(item: GraphBuilderTextItem): GraphBuilderExtraction {
  const documentId = `doc:${item.id}`;
  const nodes: GraphBuilderNode[] = [createDocumentNode(item, documentId, "data_file")];
  const edges: GraphBuilderEdge[] = [];
  const parsed = parseStructuredValue(item);

  if (!parsed.ok) {
    nodes.push({
      id: `${documentId}:parse_error`,
      label: "Parse Error",
      type: "schema_error",
      sourceItemId: item.id,
      metadata: {
        path: normalizePath(item.path),
        message: parsed.error
      }
    });
    edges.push({
      source: documentId,
      target: `${documentId}:parse_error`,
      relation: "contains",
      confidence: "AMBIGUOUS",
      confidenceScore: 0.2,
      sourceItemId: item.id,
      context: "schema_parse"
    });
    return { item, nodes, edges };
  }

  const seen = new Set<string>();
  const visitValue = (value: unknown, path: string[], parentId: string, depth: number) => {
    if (depth > 5 || nodes.length > 250) {
      return;
    }

    if (Array.isArray(value)) {
      const nodeId = `${documentId}:schema:${slugify(path.join(".")) || "root_array"}`;
      addSchemaNode(nodeId, path.at(-1) ?? "array", "schema_array", parentId, value.length);
      const sample = value.find((entry) => typeof entry === "object" && entry !== null) ?? value[0];
      if (sample !== undefined) {
        visitValue(sample, [...path, "item"], nodeId, depth + 1);
      }
      return;
    }

    if (typeof value === "object" && value !== null) {
      for (const [key, child] of Object.entries(value)) {
        const nextPath = [...path, key];
        const nodeId = `${documentId}:schema:${slugify(nextPath.join("."))}`;
        const type = Array.isArray(child) ? "schema_array" : typeof child === "object" && child !== null ? "schema_object" : "schema_field";
        addSchemaNode(nodeId, key, type, parentId, child);
        visitValue(child, nextPath, nodeId, depth + 1);
      }
      return;
    }

    if (typeof value === "string" && looksLikeReference(value)) {
      const resourceId = `resource:${slugify(value)}`;
      if (!seen.has(resourceId)) {
        seen.add(resourceId);
        nodes.push({
          id: resourceId,
          label: sanitizeLabel(value),
          type: "resource",
          sourceItemId: item.id,
          metadata: { href: value }
        });
      }
      edges.push({
        source: parentId,
        target: resourceId,
        relation: "references",
        confidence: "EXTRACTED",
        confidenceScore: 1,
        sourceItemId: item.id,
        context: "schema_value"
      });
    }
  };

  const addSchemaNode = (nodeId: string, label: string, type: string, parentId: string, value: unknown) => {
    if (!seen.has(nodeId)) {
      seen.add(nodeId);
      nodes.push({
        id: nodeId,
        label: sanitizeLabel(label),
        type,
        sourceItemId: item.id,
        metadata: {
          path: normalizePath(item.path),
          valueType: Array.isArray(value) ? "array" : value === null ? "null" : typeof value,
          sample: primitiveSample(value)
        }
      });
    }
    edges.push({
      source: parentId,
      target: nodeId,
      relation: "contains",
      confidence: "EXTRACTED",
      confidenceScore: 1,
      sourceItemId: item.id,
      context: "schema"
    });
  };

  visitValue(parsed.value, [], documentId, 0);
  return { item, nodes, edges };
}

function parseStructuredValue(item: GraphBuilderTextItem): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    if (extensionOf(item.path) === ".json") {
      return { ok: true, value: JSON.parse(item.text) };
    }
    return { ok: true, value: parseSimpleYaml(item.text) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function parseSimpleYaml(text: string): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  const stack: Array<{ indent: number; value: Record<string, unknown> }> = [{ indent: -1, value: root }];

  for (const rawLine of text.split(/\r?\n/)) {
    if (!rawLine.trim() || rawLine.trim().startsWith("#")) {
      continue;
    }
    const match = /^(\s*)(?:-\s*)?([^:#][^:]*):\s*(.*)$/.exec(rawLine);
    if (!match) {
      continue;
    }
    const indent = match[1].length;
    const key = match[2].trim();
    const rawValue = match[3].trim();
    while (stack.length > 1 && indent <= stack.at(-1)!.indent) {
      stack.pop();
    }
    const parent = stack.at(-1)!.value;
    if (!rawValue) {
      const child: Record<string, unknown> = {};
      parent[key] = child;
      stack.push({ indent, value: child });
    } else {
      parent[key] = parseScalar(rawValue);
    }
  }

  return root;
}

function parseScalar(value: string): unknown {
  const unquoted = value.replace(/^['"]|['"]$/g, "");
  if (unquoted === "true") {
    return true;
  }
  if (unquoted === "false") {
    return false;
  }
  if (unquoted === "null") {
    return null;
  }
  const numberValue = Number(unquoted);
  return Number.isFinite(numberValue) && unquoted !== "" ? numberValue : unquoted;
}

function primitiveSample(value: unknown): unknown {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null) {
    return value;
  }
  if (Array.isArray(value)) {
    return `array(${value.length})`;
  }
  return undefined;
}

function looksLikeReference(value: string): boolean {
  return /^(https?:\/\/|\.\/|\.\.\/|\/|[\w-]+\.[\w-]+(?:\/|$))/.test(value);
}

function scriptKindForPath(path: string): ts.ScriptKind {
  switch (extensionOf(path)) {
    case ".tsx":
      return ts.ScriptKind.TSX;
    case ".jsx":
      return ts.ScriptKind.JSX;
    case ".js":
    case ".mjs":
    case ".cjs":
      return ts.ScriptKind.JS;
    case ".json":
      return ts.ScriptKind.JSON;
    default:
      return ts.ScriptKind.TS;
  }
}

function lineForNode(sourceFile: ts.SourceFile, node: ts.Node): number {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function symbolIdForDeclaration(node: ts.Node, documentId: string, sourceFile: ts.SourceFile): string | undefined {
  const label = symbolLabelForDeclaration(node, sourceFile);
  return label ? `${documentId}:symbol:${slugify(label)}` : undefined;
}

function symbolLabelForDeclaration(node: ts.Node, sourceFile: ts.SourceFile): string | undefined {
  if ((ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) && node.name) {
    return node.name.text;
  }
  if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isEnumDeclaration(node)) {
    return node.name.text;
  }
  if ((ts.isMethodDeclaration(node) || ts.isPropertyDeclaration(node)) && ts.isIdentifier(node.name)) {
    const className = ts.isClassDeclaration(node.parent) && node.parent.name ? node.parent.name.text : undefined;
    return className ? `${className}.${node.name.text}` : node.name.text;
  }
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
    return node.name.text;
  }
  return undefined;
}

function calleeName(expression: ts.Expression): string | undefined {
  if (ts.isIdentifier(expression)) {
    return expression.text;
  }
  if (ts.isPropertyAccessExpression(expression)) {
    return expression.name.text;
  }
  return undefined;
}

function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((tag) => String(tag));
  }
  if (typeof value === "string") {
    return value.split(",").map((tag) => tag.trim()).filter(Boolean);
  }
  return [];
}

function extractInlineTags(text: string): string[] {
  return [...text.matchAll(/(^|\s)#([\p{Letter}\p{Number}_-]+)/gu)].map((match) => match[2]);
}

function createDocumentNode(
  item: GraphBuilderTextItem,
  documentId: string,
  type: string,
  frontmatter: Record<string, unknown> = {}
): GraphBuilderNode {
  return {
    id: documentId,
    label: sanitizeLabel(String(frontmatter.title ?? inferTitle(item))),
    type,
    sourceItemId: item.id,
    sourceUrl: item.url,
    storageRef: item.storageRef,
    metadata: {
      ...item.metadata,
      frontmatter,
      hash: item.hash,
      updatedAt: item.updatedAt,
      mimeType: item.mimeType,
      path: normalizePath(item.path),
      sourceType: item.sourceType
    }
  };
}

function getLineNumber(text: string, offset: number): number {
  return text.slice(0, offset).split("\n").length;
}

function resolveImportTarget(sourcePath: string | undefined, specifier: string): string {
  const resolved = resolveRelativePath(sourcePath, specifier);
  return normalizePath(resolved) ?? specifier;
}