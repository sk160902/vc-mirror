import type { Annotation } from './client.js';
import type { Source } from '../../shared/types.js';

/**
 * Citations come ONLY from real url_citation annotations returned by the search
 * tool. A URL the model wrote inside its JSON body is never trusted and never
 * reaches this function.
 *
 * Observed annotation shape (verified against gemini-3.5-flash, SDK 2.12):
 *   { start_index, end_index, url, title, type: 'url_citation' }
 * `title` is the source domain (e.g. "refed.org"); `url` is a
 * vertexaisearch grounding redirect, which is the citation Google actually
 * stands behind, so it is kept verbatim rather than rewritten.
 */
/** Grounded answers routinely cite the same domain many times over. */
const MAX_SOURCES = 4;

export function extractSources(annotations: Annotation[]): Source[] {
  const seen = new Set<string>();
  const seenPublishers = new Set<string>();
  const sources: Source[] = [];

  for (const annotation of annotations) {
    if (sources.length >= MAX_SOURCES) break;
    if (annotation.type && annotation.type !== 'url_citation') continue;

    // The API returns `url`; `uri` is tolerated in case the field is renamed.
    const rawUrl = annotation.url ?? annotation.uri ?? '';
    const url = typeof rawUrl === 'string' ? rawUrl.trim() : '';
    if (!url) continue;

    let hostname: string;
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') continue;
      hostname = parsed.hostname.replace(/^www\./, '');
    } catch {
      continue;
    }

    if (seen.has(url)) continue;

    // Prefer the annotation's own title: it names the real publisher, whereas
    // the redirect hostname would just read "vertexaisearch.cloud.google.com".
    const title = annotation.title?.trim();
    const isRedirect = hostname.endsWith('vertexaisearch.cloud.google.com');
    const publisher = title || (isRedirect ? null : hostname);

    // One citation per publisher: four links to the same domain read as noise.
    const publisherKey = (publisher ?? url).toLowerCase();
    if (seenPublishers.has(publisherKey)) continue;

    seen.add(url);
    seenPublishers.add(publisherKey);

    sources.push({
      title: title || publisher || 'Source',
      publisher,
      url,
    });
  }

  return sources;
}
