import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MarkdownRenderer } from '../../src/components/markdown/MarkdownRenderer';

describe('MarkdownRenderer', () => {
    it('renders headings and bold text', () => {
        render(<MarkdownRenderer markdown="# Title\n\nSome **bold** text." />);
        expect(screen.getByRole('heading', { level: 1, name: 'Title' })).toBeInTheDocument();
        expect(screen.getByText('Some ')).toBeInTheDocument();
    });

    it('escapes raw HTML instead of rendering it', () => {
        render(<MarkdownRenderer markdown="Hi <script>alert(1)</script>" />);
        expect(screen.getByText('Hi &lt;script&gt;alert(1)&lt;/script&gt;')).toBeInTheDocument();
    });

    it('renders fenced code blocks', () => {
        render(<MarkdownRenderer markdown="```cpp\n#include <bits>\n```" />);
        expect(screen.getByText('#include <bits>')).toBeInTheDocument();
    });

    it('gives external links target=_blank and rel=noopener noreferrer', () => {
        render(<MarkdownRenderer markdown="[Example](https://example.com)" />);
        const link = screen.getByRole('link', { name: 'Example' });
        expect(link.getAttribute('target')).toBe('_blank');
        expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    });

    it('never crashes on malformed input', () => {
        expect(() => render(<MarkdownRenderer markdown="```cpp\nunclosed fence" />)).not.toThrow();
    });

    it('renders nothing for empty markdown', () => {
        render(<MarkdownRenderer markdown="" />);
        expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });
});
