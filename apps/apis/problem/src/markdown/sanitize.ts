/**
 * HTML sanitization for Markdown rendering output.
 *
 * Uses DOMPurify with a jsdom DOM (server-side) to strip dangerous content
 * from HTML produced by markdown-it before it is stored or rendered.
 *
 * Allow-list covers all Markdown-generated HTML that LCArena needs:
 *   headings, paragraphs, breaks, horizontal rules, strong/em, lists,
 *   blockquotes, pre/code, tables, links, images, and math spans.
 *
 * Everything else (script, style, event handlers, javascript: URLs, etc.)
 * is removed. Safe https:// and relative links are preserved.
 */

import DOMPurify from "dompurify";
import { JSDOM } from "jsdom";

const window = new JSDOM("").window;
const purify = DOMPurify(window as unknown as Window & typeof globalThis);

// URI schemes considered safe for href/src attributes.
const ALLOWED_URI_REGEXP =
  /^(?:(?:(?:f|ht)tps?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i;

/**
 * Sanitize an HTML string, removing XSS vectors while preserving safe
 * Markdown-derived markup (including `<span class="math">` for LaTeX).
 *
 * @param html - HTML string to sanitize.
 * @returns Sanitized HTML string.
 */
export function sanitizeHtml(html: string): string {
  return purify.sanitize(html, {
    ADD_TAGS: ["span"],
    ADD_ATTR: ["class"],
    ADD_URI_SAFE_ATTR: ["href", "src"],
    ALLOWED_URI_REGEXP,
    FORCE_BODY: false,
  });
}
