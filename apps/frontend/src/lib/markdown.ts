/**
 * Frontend Markdown utilities.
 *
 * Lightweight helpers for extracting structured metadata from raw Markdown
 * problem descriptions (title, slug, tags) without re-parsing the whole
 * document. Used by the admin editor and problem pages.
 */

/**
 * Extract the problem title from the first H1 heading, if present.
 * Returns undefined when there is no H1 (never invents a title).
 */
export function extractTitle(markdown: string): string | undefined {
    const m = markdown.match(/^#\s+(.+?)\s*$/m);
    return m ? m[1].trim() : undefined;
}

/**
 * Derive a kebab-case slug from a title. Returns undefined when no title.
 */
export function extractSlug(title: string): string | undefined {
    if (!title) return undefined;
    const slug = title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/, '');
    return slug || undefined;
}

/**
 * Extract tags from a "**Topics:** ..." metadata line, if present.
 * Returns an empty array when none found (never invents tags).
 */
export function extractTags(markdown: string): string[] {
    const m = markdown.match(/\*\*Topics:\*\*\s*([^\n]+)/i);
    if (!m) return [];
    return m[1]
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
}

/**
 * Quick smoke test for balanced fenced code blocks (even number of fence
 * markers). Used for warnings only — never rejects valid input.
 */
export function hasBalancedFences(markdown: string): boolean {
    const fenceRe = /^ {0,3}(`{3,}|~{3,})/gm;
    let count = 0;
    let match: RegExpExecArray | null;
    while ((match = fenceRe.exec(markdown)) !== null) {
        count++;
    }
    return count % 2 === 0;
}
