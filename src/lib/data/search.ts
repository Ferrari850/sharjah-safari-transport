import "server-only";

/**
 * Make a user-supplied search term safe to embed in a PostgREST filter.
 *
 * PostgREST parses `or=(a.ilike.%x%,b.ilike.%x%)` structurally, so commas,
 * parentheses, dots and quotes in raw input can break out of the intended
 * column list and rewrite the filter. Rather than escaping — which varies by
 * operator — this keeps only characters that are meaningful to a human
 * searching a name, email, plate or employee number, and caps the length.
 *
 * `%` and `_` are dropped as well so a user cannot turn a search into a
 * full-table wildcard scan.
 */
export function sanitizeSearch(raw: string | undefined | null): string {
  if (!raw) return "";
  return raw
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s@.+-]/gu, " ")
    .replace(/\./g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

/** Build an `ilike` pattern for a sanitized term. */
export function likePattern(term: string): string {
  return `%${term}%`;
}

/**
 * Read a single string query parameter, ignoring repeated values.
 */
export function firstParam(
  value: string | string[] | undefined,
): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

/**
 * Narrow a query parameter to a known vocabulary, so a hand-edited URL can
 * never push an arbitrary value into a database filter.
 */
export function enumParam<T extends string>(
  value: string | string[] | undefined,
  allowed: readonly T[],
): T | "" {
  const raw = firstParam(value);
  return (allowed as readonly string[]).includes(raw) ? (raw as T) : "";
}
