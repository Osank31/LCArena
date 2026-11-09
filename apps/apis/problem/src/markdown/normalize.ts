/**
 * Markdown normalization utilities.
 *
 * Pure text-level normalization that operates on the raw Markdown string
 * BEFORE parsing. It never touches the contents of fenced code blocks so
 * that code indentation and formatting are preserved exactly.
 */

const FENCE_RE = /^( {0,3})(`{3,}|~{3,})(\S*)(\s*.*)$/;

/**
 * Test whether a line is a fenced-code-block opening or closing marker.
 */
function isFence(line: string): boolean {
    return FENCE_RE.test(line);
}

/**
 * Normalize raw Markdown into a canonical, clean form.
 *
 * Transformations (applied in order):
 *   1. Normalize line endings (CRLF/CR -> LF).
 *   2. Remove trailing whitespace on every line.
 *   3. Collapse runs of 3+ consecutive blank lines into a single blank line.
 *   4. Strip trailing blank lines at end of file.
 *   5. Ensure the file ends with exactly one newline.
 *
 * Fenced code block contents (between ```...``` or ~~~...~~~ markers) are
 * left verbatim — no whitespace trimming or blank-line collapsing happens
 * inside them, preserving code indentation and formatting.
 *
 * @param input - Raw Markdown string.
 * @returns Normalized Markdown string safe to store as the canonical form.
 */
export function normalizeMarkdown(input: string): string {
    if (input == null) {
        return '';
    }

    // 1. Normalize line endings: CRLF and standalone CR -> LF.
    let text = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    const lines = text.split('\n');
    const out: string[] = [];
    let inFence = false;
    let fenceChar = '';
    let blankRun = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Track fenced code block boundaries so we can preserve their contents.
        if (isFence(line)) {
            const match = line.match(FENCE_RE)!;
            const marker = match[2];
            if (!inFence) {
                inFence = true;
                fenceChar = marker;
                out.push(line);
                blankRun = 0;
                continue;
            }
            if (marker.length >= fenceChar.length) {
                inFence = false;
                fenceChar = '';
                out.push(line);
                blankRun = 0;
                continue;
            }
            // Nested/different fence inside a block: treat as content.
        }

        if (inFence) {
            // Inside a fenced block: preserve line exactly as-is.
            out.push(line);
            blankRun = 0;
            continue;
        }

        // Outside fences: trim trailing whitespace.
        const trimmed = line.replace(/[ \t]+$/, '');

        if (trimmed === '') {
            blankRun++;
            if (blankRun > 1) {
                // Collapse 3+ blanks into a single blank line (blankRun==1
                // means we keep one blank line; >1 skips extras).
                continue;
            }
            out.push('');
        } else {
            blankRun = 0;
            out.push(trimmed);
        }
    }

    // 4. Strip trailing blank lines.
    while (out.length > 0 && out[out.length - 1] === '') {
        out.pop();
    }

    // 5. Ensure exactly one trailing newline.
    return out.join('\n') + (out.length > 0 ? '\n' : '');
}
