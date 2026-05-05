import type { GraphBuilderProvider, GraphBuilderTextItem } from "../core/types.js";

export interface ToMarkdownConverter<TInput = unknown> {
  convert(input: TInput): Promise<string> | string;
}

export interface ToMarkdownRecord<TInput = unknown> {
  id: string;
  input: TInput;
  title?: string;
  path?: string;
  url?: string;
  metadata?: Record<string, unknown>;
}

export async function convertRecords<TInput>(
  records: ToMarkdownRecord<TInput>[],
  converter: ToMarkdownConverter<TInput>
): Promise<GraphBuilderTextItem[]> {
  return Promise.all(
    records.map(async (record) => ({
      id: record.id,
      title: record.title,
      path: record.path,
      url: record.url,
      metadata: record.metadata,
      sourceType: "to-markdown",
      text: await converter.convert(record.input)
    }))
  );
}

export function createConvertedProvider<TInput>(
  records: ToMarkdownRecord<TInput>[],
  converter: ToMarkdownConverter<TInput>
): GraphBuilderProvider<ToMarkdownRecord<TInput>> {
  return {
    name: "to-markdown",
    async *list() {
      for (const record of records) {
        yield record;
      }
    },
    async read(record) {
      return {
        id: record.id,
        title: record.title,
        path: record.path,
        url: record.url,
        metadata: record.metadata,
        sourceType: "to-markdown",
        text: await converter.convert(record.input)
      };
    }
  };
}