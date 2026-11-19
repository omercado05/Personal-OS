export const MAX_SEARCH_TERMS = 8;

/**
 * Divide la consulta en palabras, sin duplicados (ignorando mayúsculas,
 * conserva la primera grafía) y con un máximo de MAX_SEARCH_TERMS.
 */
export function searchTerms(q: string): string[] {
  const seen = new Set<string>();
  const terms: string[] = [];
  for (const word of q.split(/\s+/)) {
    const key = word.toLowerCase();
    if (word === "" || seen.has(key)) continue;
    seen.add(key);
    terms.push(word);
  }
  return terms.slice(0, MAX_SEARCH_TERMS);
}

/**
 * Construye un filtro where que exige que cada término cumpla al menos
 * una de las condiciones devueltas por `conditionsFor`, en cualquier orden.
 */
export function everyTermMatches<W>(
  terms: string[],
  conditionsFor: (term: string) => W[],
): { AND: { OR: W[] }[] } {
  return { AND: terms.map((term) => ({ OR: conditionsFor(term) })) };
}
