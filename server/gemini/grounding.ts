import type { Annotation } from './client.js';
import type { Source } from '../../shared/types.js';

/**
 * Citations come ONLY from real url_citation annotations returned by the search
 * tool. A URL that the model wrote inside its JSON body is never trusted and
 * never reaches this function.
 */
export function extractSources(annotations: Annotation[]): Source[] {
  const seen = new Set<string>();
  const sources: Source[] = [];

  for (const annotation of annotations) {
    // Accept the citation type explicitly; ignore any other annotation kind.
    if (annotation.type && annotation.type !== 'url_citation') continue;

    const url = typeof annotation.uri === 'string' ? annotation.uri.trim() : '';
    if (!url) continue;

    let publisher: string | null = null;
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') continue;
      publisher = parsed.hostname.replace(/^www\./, '');
    } catch {
      // Not a resolvable URL, so it is not a usable citation.
      continue;
    }

    if (seen.has(url)) continue;
    seen.add(url);

    sources.push({
      title: annotation.title?.trim() || publisher,
      publisher,
      url,
    });
  }

  return sources;
}
