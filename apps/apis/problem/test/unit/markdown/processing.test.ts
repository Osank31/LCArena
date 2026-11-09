import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { processMarkdown } from '../../../src/markdown/processing.service';

describe('processMarkdown', () => {
    it('returns canonical, html, and metadata', () => {
        const result = processMarkdown('# Hello\n\nSome **bold** text.');
        assert.ok(result);
        assert.equal(typeof result.canonical, 'string');
        assert.equal(typeof result.html, 'string');
        assert.ok(result.metadata);
        assert.equal(typeof result.metadata.title, 'string');
        assert.equal(typeof result.metadata.slug, 'string');
        assert.ok(Array.isArray(result.metadata.tags));
        assert.ok(Array.isArray(result.metadata.codeLangs));
    });

    it('stores the canonical (normalized) Markdown, not HTML', () => {
        const input = '  # Title  \n\n  body   \n';
        const result = processMarkdown(input);
        assert.equal(result.canonical, '# Title\n\nbody\n');
    });

    it('escapes raw HTML so no script tags survive', () => {
        const result = processMarkdown('Hello <script>alert(1)</script>');
        assert.ok(!result.html.includes('<script'));
        assert.ok(result.html.includes('&lt;script'));
    });

    it('extracts title and slug from the first H1', () => {
        const result = processMarkdown('# Two Sum\n\nbody');
        assert.equal(result.metadata.title, 'Two Sum');
        assert.equal(result.metadata.slug, 'two-sum');
    });

    it('returns undefined title/slug when no H1 exists', () => {
        const result = processMarkdown('just a paragraph');
        assert.equal(result.metadata.title, undefined);
        assert.equal(result.metadata.slug, undefined);
    });

    it('extracts tags from a Topics metadata line', () => {
        const result = processMarkdown('# T\n\n**Topics:** Array, Hash Table\n\nbody');
        assert.deepEqual(result.metadata.tags, ['Array', 'Hash Table']);
    });

    it('collects code block languages', () => {
        const result = processMarkdown('```cpp\ncode\n```\n\n```py\ncode\n```\n');
        assert.deepEqual(result.metadata.codeLangs, ['cpp', 'py']);
    });

    it('detects math', () => {
        const withMath = processMarkdown('# T\n\n$$E=mc^2$$\n');
        assert.equal(withMath.metadata.hasMath, true);
        const withoutMath = processMarkdown('# T\n\nno math\n');
        assert.equal(withoutMath.metadata.hasMath, false);
    });

    it('never throws on malformed input; falls back to raw text', () => {
        const result = processMarkdown('# only an opening fence\n```cpp\nunclosed\n');
        assert.ok(result.canonical.length > 0);
        assert.ok(result.html.length > 0);
    });
});
