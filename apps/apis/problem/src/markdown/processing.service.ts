/**
 * Centralized Markdown processing pipeline for LCArena problem descriptions.
 *
 * Pipeline (in order):
 *   1. normalizeMarkdown      - line endings, whitespace, blank lines
 *   2. markdown-it parse      - Markdown -> HTML (html: false, raw HTML escaped)
 *   3. LaTeX (texmath)        - $$...$$ / $...$ -> <span class="math"> placeholders
 *   4. syntax highlighting    - fenced code blocks wrapped for highlight.js
 *   5. DOMPurify sanitize     - strip XSS vectors, preserve safe markup
 *   6. Store canonical Markdown - the normalized Markdown (NOT HTML) is stored
 *
 * The canonical Markdown representation is what gets persisted to the
 * `description` field. HTML is derived at render time and is never the
 * source of truth.
 */

import markdownIt from 'markdown-it';
import texmath from 'markdown-it-texmath';
import hljs from 'highlight.js';
import { sanitizeHtml } from './sanitize';
import { normalizeMarkdown } from './normalize';

export interface ProcessedMarkdown {
    /** Normalized, safe Markdown to store as the canonical representation. */
    canonical: string;
    /** Sanitized HTML derived from `canonical` (render-time representation). */
    html: string;
    /** Light metadata extracted during processing. */
    metadata: {
        title?: string;
        slug?: string;
        tags: string[];
        hasMath: boolean;
        codeLangs: string[];
    };
}

/**
 * Extract a candidate title from the first H1 heading in the Markdown.
 * Returns undefined if no H1 exists (we never invent content).
 */
function extractTitle(markdown: string): string | undefined {
    const h1 = markdown.match(/^#\s+(.+?)\s*$/m);
    return h1 ? h1[1].trim() : undefined;
}

/**
 * Derive a slug from a title (lowercase, kebab-case). Returns undefined
 * when there is no title — we never invent a slug.
 */
function extractSlug(title?: string): string | undefined {
    if (!title) return undefined;
    return (
        title
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || undefined
    );
}

/**
 * Collect the set of fenced-code language identifiers used in the Markdown.
 */
function collectCodeLangs(markdown: string): string[] {
    const langs = new Set<string>();
    const fenceRe = /^ {0,3}(`{3,}|~{3,})\s*(\S*)(\s*.*)$/gm;
    let match: RegExpExecArray | null;
    while ((match = fenceRe.exec(markdown)) !== null) {
        const lang = match[2]?.trim();
        if (lang) {
            langs.add(lang);
        }
    }
    return Array.from(langs);
}

/**
 * Detect whether the Markdown contains LaTeX math delimiters.
 */
function hasMath(markdown: string): boolean {
    return /\$\$|\$[^\s]/.test(markdown);
}

/**
 * Build a highlighted HTML renderer for fenced code blocks using highlight.js.
 * Returns the markdown-it renderer rule replacement.
 */
function makeHighlightRenderer() {
    return function (
        this: any,
        tokens: any[],
        idx: number,
        options: any,
        env: any,
        self: any,
    ): string {
        const token = tokens[idx];
        const lang = token.info ? token.info.trim() : '';
        const code = token.content;

        // Escape HTML entities in code content (markdown-it already escapes,
        // but token.content is the raw string; we re-escape for safety).
        const escaped = self
            ? self.asEscape?.call(this, code) || escapeHtml(code)
            : escapeHtml(code);

        if (lang && hljs.getLanguage(lang)) {
            const highlighted = hljs.highlight(code, { language: lang });
            return `<pre><code class="hljs language-${escapeHtml(
                lang,
            )}">${highlighted.value}</code></pre>`;
        }

        // Unknown language or no language: plain code block.
        return `<pre><code class="language-${escapeHtml(lang)}">${escaped}</code></pre>`;
    };
}

function escapeHtml(unsafe: string): string {
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Process raw Markdown through the full pipeline.
 *
 * Never throws for malformed Markdown — on unexpected parse errors it falls
 * back to the raw (normalized) input so create/update always succeed.
 *
 * @param input - Raw Markdown string.
 * @returns ProcessedMarkdown with canonical, html, and metadata.
 */
export function processMarkdown(input: string): ProcessedMarkdown {
    const canonical = normalizeMarkdown(input);

    let html = '';
    try {
        const md = markdownIt({
            html: false, // escape raw HTML by default
            xhtmlOut: false,
            breaks: true,
            linkify: true,
            typographer: true,
        });

        // LaTeX math support: $$...$$ and $...$ -> <span class="math">
        md.use(texmath, {
            delimiters: 'dollars',
            // mathjs not needed; we only produce placeholder spans, frontend KaTeX renders them.
            engine: (katexInput: string) => katexInput,
        });

        // Syntax highlighting for fenced code blocks via highlight.js.
        const originalFence = md.renderer.rules.fence.bind(md.renderer.rules);
        md.renderer.rules.fence = makeHighlightRenderer();

        html = md.render(canonical);
    } catch (err) {
        // Parse failure: fall back to a minimal HTML rendering of the raw text.
        // We never fail create/update solely because Markdown is malformed.
        html = `<p>${escapeHtml(canonical)}</p>`;
    }

    const sanitizedHtml = sanitizeHtml(html);

    const title = extractTitle(canonical);
    const slug = extractSlug(title);
    const tags = extractTags(canonical);
    const codeLangs = collectCodeLangs(canonical);

    return {
        canonical,
        html: sanitizedHtml,
        metadata: {
            title,
            slug,
            tags,
            hasMath: hasMath(canonical),
            codeLangs,
        },
    };
}

/**
 * Extract candidate tags from a "**Topics:** ..." metadata line, if present.
 * Returns an empty array when none found — we never invent tags.
 */
function extractTags(markdown: string): string[] {
    const m = markdown.match(/\*\*Topics:\*\*\s*([^\n]+)/i);
    if (!m) return [];
    return m[1]
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
}
