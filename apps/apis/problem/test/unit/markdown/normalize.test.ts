import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMarkdown } from '../../../src/markdown/normalize';

describe('normalizeMarkdown', () => {
    it('returns empty string for null input', () => {
        assert.equal(normalizeMarkdown(null as unknown as string), '');
        assert.equal(normalizeMarkdown(undefined as unknown as string), '');
    });

    it('normalizes CRLF and CR line endings to LF', () => {
        assert.equal(normalizeMarkdown('a\r\nb\rc\n'), 'a\nb\nc\n');
    });

    it('removes trailing whitespace on every line', () => {
        assert.equal(normalizeMarkdown('a   \tb  \n c \t\n'), 'a\nc\n');
    });

    it('collapses runs of 3+ blank lines into a single blank line', () => {
        assert.equal(normalizeMarkdown('a\n\n\n\nb\n'), 'a\n\nb\n');
    });

    it('keeps a single blank line between paragraphs', () => {
        assert.equal(normalizeMarkdown('a\n\nb\n'), 'a\n\nb\n');
    });

    it('strips trailing blank lines at end of file', () => {
        assert.equal(normalizeMarkdown('a\n\n\n\n'), 'a\n');
    });

    it('ensures exactly one trailing newline', () => {
        assert.equal(normalizeMarkdown('a'), 'a\n');
        assert.equal(normalizeMarkdown('a\n\n'), 'a\n');
    });

    it('preserves fenced code block contents verbatim', () => {
        const input = '# Title\n\n   \n\n```cpp\n#include <bits>\n  int x = 1;\n```\n\nmore\n';
        assert.equal(
            normalizeMarkdown(input),
            '# Title\n\n```cpp\n#include <bits>\n  int x = 1;\n```\nmore\n',
        );
    });

    it('does not trim trailing whitespace inside fenced blocks', () => {
        const input = '```js\nconst x = 1;   \n```\n';
        assert.equal(normalizeMarkdown(input), '```js\nconst x = 1;   \n```\n');
    });

    it('handles a closing fence shorter than the opening fence as content', () => {
        const input = '```\ncode\n``\n```\n';
        // opening fence is ``` (3), closing `` (2) is shorter -> treated as content,
        // then ``` closes the block
        assert.equal(normalizeMarkdown(input), '```\ncode\n``\n```\n');
    });
});
