declare module 'markdown-it' {
    class MarkdownIt {
        render(input: string): string;
        renderInline(input: string): string;
        use(plugin: any, ...options: any[]): this;
        renderer: {
            rules: Record<string, any>;
        };
        utils: {
            escapeHtml(input: string): string;
            [key: string]: any;
        };
        [key: string]: any;
    }
    const markdownIt: (options?: Record<string, any>) => MarkdownIt;
    export = markdownIt;
}

declare module 'markdown-it-texmath' {
    function texmath(
        md: any,
        options?: {
            delimiters?: 'dollars';
            engine?: (input: string, displayMode: boolean) => string;
        },
    ): void;
    export = texmath;
}

declare module 'jsdom' {
    class JSDOM {
        constructor(html?: string);
        window: Window & typeof globalThis;
    }
    export { JSDOM };
}

declare module 'dompurify' {
    function DOMPurify(window: any): {
        sanitize(html: string, config?: Record<string, any>): string;
    };
    const dompurify: typeof DOMPurify;
    export default dompurify;
}
