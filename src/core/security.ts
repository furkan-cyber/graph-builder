const UNPAIRED_SURROGATE_PATTERN = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

export function sanitizeUnicodeText(text: string | undefined): string {
  if (!text) {
    return "";
  }

  return text.replace(UNPAIRED_SURROGATE_PATTERN, "");
}

export function sanitizeSerializableValue<T>(value: T): T {
  if (typeof value === "string") {
    return sanitizeUnicodeText(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeSerializableValue(item)) as T;
  }

  if (!value || typeof value !== "object" || value instanceof Date) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => [
      key,
      sanitizeSerializableValue(nestedValue)
    ])
  ) as T;
}

export function sanitizeLabel(text: string | undefined, maxLength = 256): string {
  const sanitized = sanitizeUnicodeText(text).replace(/[\x00-\x1f\x7f]/g, "").trim();
  return sanitized.slice(0, maxLength);
}