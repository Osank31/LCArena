/**
 * MarkdownRenderer — single reusable Markdown rendering component for LCArena.
 *
 * Renders canonical Markdown (stored in `problem.description`) into safe,
 * themed HTML using markdown-it + DOMPurify + highlight.js + KaTeX.
 *
 * Features:
 *   - Headings (h1-h6) with anchor IDs
 *   - Bold / italic, inline code
 *   - Fenced code blocks with syntax highlighting (C++, Java, Python, JS, TS,
 *     SQL, JSON) via highlight.js; horizontal scroll overflow
 *   - Ordered / unordered / nested lists, task lists
 *   - Markdown tables (responsive overflow wrapper)
 *   - Blockquotes
 *   - Links (external open in new tab + rel="noopener noreferrer")
 *   - Horizontal rules
 *   - LaTeX math ($$...$$ and $...$) via KaTeX
 *   - Special characters / Unicode preserved
 *   - Dark / light theme support (highlight.js + KaTeX themes)
 *
 * Markdown stays the canonical stored format; HTML is derived at render time.
 * User-submitted content is sanitized with DOMPurify on both the server and
 * here (defense-in-depth).
 */

import React, { useEffect, useRef, useCallback } from 'react';
import MarkdownIt from 'markdown-it';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js/lib/common';
import 'highlight.js/styles/github-dark.css';
import 'highlight.js/styles/github.css';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import texmath from 'markdown-it-texmath';

export interface MarkdownRendererProps {
    /** Canonical Markdown string (raw, unsanitized source). */
    markdown: string;
    /** Additional Tailwind classes for the container. */
    className?: string;
    /** Force dark mode; when omitted, follows the system / next-themes. */
    darkMode?: boolean;
    /** Optional click handler for links (internal navigation). */
    onLinkClick?: (href: string) => void;
}

interface MarkdownItInstance {
    render(input: string): string;
    renderInline(input: string): string;
    use(plugin: any, ...options: any[]): this;
    renderer: { rules: Record<string, any> };
    utils: { escapeHtml(input: string): string; [key: string]: any };
    [key: string]: any;
}

/**
 * KaTeX engine for markdown-it-texmath: renders LaTeX to an HTML string.
 */
function katexEngine(katexInput: string, displayMode: boolean): string {
    let html = '';
    try {
        html = katex.renderToString(katexInput, {
            displayMode,
            throwOnError: false,
            trust: true,
        });
    } catch {
        // Leave input as-is if KaTeX cannot render it.
        html = `<span>${(MarkdownIt as any).utils.escapeHtml(katexInput)}</span>`;
    }
    return html;
}

const md = MarkdownIt({
    html: false, // escape raw HTML by default
    xhtmlOut: false,
    breaks: true,
    linkify: true,
    typographer: true,
}) as MarkdownItInstance;

// LaTeX math: $$...$$ and $...$ -> <span class="math"> (KaTeX placeholder).
md.use(
    texmath as any,
    {
        delimiters: 'dollars',
        engine: katexEngine,
    } as any,
);

// Syntax highlighting for fenced code blocks via highlight.js.
const defaultFence = md.renderer.rules.fence;
md.renderer.rules.fence = function (
    tokens: any[],
    idx: number,
    _options: any,
    _env: any,
    self: any,
): string {
    const token = tokens[idx];
    const lang = token.info ? token.info.trim() : '';
    const code = token.content;
    const escaped = self.asEscape
        ? self.asEscape(code)
        : (MarkdownIt as any).utils.escapeHtml(code);

    if (lang && hljs.getLanguage(lang)) {
        const highlighted = hljs.highlight(code, { language: lang });
        return `<pre><code class="hljs language-${(MarkdownIt as any).utils.escapeHtml(
            lang,
        )}">${highlighted.value}</code></pre>`;
    }
    return `<pre><code class="language-${(MarkdownIt as any).utils.escapeHtml(
        lang,
    )}">${escaped}</code></pre>`;
} as any;

/**
 * Sanitize HTML with DOMPurify, allowing the safe Markdown element set plus
 * math spans (class="math") and link attributes.
 */
function sanitizeHtml(html: string): string {
    return (DOMPurify as any).sanitize(html, {
        ADD_TAGS: ['span'],
        ADD_ATTR: ['class'],
        ADD_URI_SAFE_ATTR: ['href', 'src'],
        ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
        FORCE_BODY: false,
    });
}

/**
 * Render LaTeX math spans produced by markdown-it-texmath using KaTeX.
 */
function renderMath(container: HTMLElement): void {
    const mathSpans = container.querySelectorAll<HTMLElement>('.math');
    mathSpans.forEach((span) => {
        const text = span.textContent || '';
        const display = span.classList.contains('math-display');
        try {
            katex.render(text, span, {
                displayMode: display,
                throwOnError: false,
                trust: true,
            });
        } catch {
            // Leave the raw span text if KaTeX fails to render.
        }
    });
}

/**
 * Apply highlight.js to any code blocks that weren't highlighted inline.
 */
function highlightCodeBlocks(container: HTMLElement): void {
    container.querySelectorAll<HTMLElement>('pre code').forEach((block) => {
        if (block.classList.contains('hljs')) return; // already highlighted
        const lang = block.className.replace(/language-/, '').trim();
        if (lang && hljs.getLanguage(lang)) {
            hljs.highlightElement(block);
        }
    });
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
    markdown,
    className = '',
    darkMode,
    onLinkClick,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const renderedRef = useRef<string | null>(null);

    const render = useCallback(
        (source: string) => {
            const el = containerRef.current;
            if (!el) return;

            let html = '';
            try {
                html = md.render(source);
            } catch {
                // Never crash the page on malformed Markdown; fall back to plain text.
                html = `<p>${(MarkdownIt as any).utils.escapeHtml(source)}</p>`;
            }

            const safeHtml = sanitizeHtml(html);
            el.innerHTML = safeHtml;

            // Post-process: highlight code + render math.
            highlightCodeBlocks(el);
            renderMath(el);

            // Link handling: external -> new tab + noopener; internal -> onLinkClick.
            el.querySelectorAll<HTMLAnchorElement>('a').forEach((anchor) => {
                const href = anchor.getAttribute('href') || '';
                const isExternal = /^https?:\/\//i.test(href);
                if (isExternal) {
                    anchor.setAttribute('target', '_blank');
                    anchor.setAttribute('rel', 'noopener noreferrer');
                } else if (onLinkClick) {
                    anchor.addEventListener('click', (e) => {
                        e.preventDefault();
                        onLinkClick(href);
                    });
                }
            });
        },
        [onLinkClick],
    );

    useEffect(() => {
        if (!markdown || markdown === renderedRef.current) return;
        renderedRef.current = markdown;
        render(markdown);
    }, [markdown, render]);

    // Re-render when theme changes (highlight.js + KaTeX theme classes).
    useEffect(() => {
        const media = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = () => {
            if (darkMode === undefined && containerRef.current) {
                render(markdown);
            }
        };
        media.addEventListener('change', handler);
        return () => media.removeEventListener('change', handler);
    }, [darkMode, markdown, render]);

    return (
        <div
            ref={containerRef}
            className={`markdown-render text-sm leading-relaxed text-ink-2 ${className}`}
        />
    );
};
