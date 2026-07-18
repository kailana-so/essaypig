// Turns a link into a readable title from its last path segment, e.g.
// /essays/the-riddle-of-consciousness -> "the riddle of consciousness".
// Falls back to the original string when there's no usable slug.
export const titleFromUrl = (raw: string): string => {
  try {
    const { pathname } = new URL(raw);
    const slug = pathname.split('/').filter(Boolean).pop();
    if (!slug) return raw;
    const words = decodeURIComponent(slug)
      .replace(/\.[a-z0-9]+$/i, '')
      .replace(/[-_]+/g, ' ')
      .trim();
    return words || raw;
  } catch {
    return raw;
  }
};
