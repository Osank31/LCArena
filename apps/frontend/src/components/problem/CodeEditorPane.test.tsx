import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { CodeEditorPane } from './CodeEditorPane';

// Mock Monaco Editor component
vi.mock('@monaco-editor/react', () => ({
    __esModule: true,
    default: ({ value, onChange }: any) => (
        <div data-testid="mock-monaco-editor">
            <textarea
                data-testid="mock-editor-inner"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    ),
}));

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

describe('CodeEditorPane - Button-driven AI Suggestions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders editor with language label and Get AI Suggestion button', () => {
        render(
            <CodeEditorPane
                value="def solve():\n    pass"
                onChange={vi.fn()}
                language="py"
                aiEnabled={true}
            />,
        );

        expect(screen.getByText('python')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /get ai suggestion/i })).toBeInTheDocument();
        expect(screen.getByTestId('editor-font-size-controls')).toBeInTheDocument();
    });

    it('fetches suggestion and displays suggestion panel when button is clicked', async () => {
        mockedAxios.post.mockResolvedValueOnce({
            data: {
                id: 'test-msg-123',
                model: 'claude-sonnet-4-5-20250929',
                choices: [
                    {
                        index: 0,
                        insert_text: 'return x * y',
                        finish_reason: 'stop',
                        score: 0.95,
                    },
                ],
                usage: { total_tokens: 120 },
                latency_ms: 350,
            },
        });

        const handleChange = vi.fn();
        render(
            <CodeEditorPane
                value="def multiply(x, y):\n    "
                onChange={handleChange}
                language="py"
                aiEnabled={true}
            />,
        );

        const aiButton = screen.getByRole('button', { name: /get ai suggestion/i });
        fireEvent.click(aiButton);

        // Expect loading state
        expect(screen.getByText(/thinking/i)).toBeInTheDocument();

        // Wait for suggestion panel to appear
        await waitFor(() => {
            expect(screen.getByTestId('ai-suggestion-panel')).toBeInTheDocument();
        });

        expect(screen.getByText('return x * y')).toBeInTheDocument();
        expect(screen.getByText('claude-sonnet-4-5-20250929')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /insert at cursor/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
    });

    it('inserts suggestion into code and dismisses panel when Insert at Cursor is clicked', async () => {
        mockedAxios.post.mockResolvedValueOnce({
            data: {
                id: 'test-msg-456',
                model: 'claude-sonnet-4-5-20250929',
                choices: [{ index: 0, insert_text: 'return True', finish_reason: 'stop', score: 0.9 }],
            },
        });

        const handleChange = vi.fn();
        render(
            <CodeEditorPane
                value="def check():"
                onChange={handleChange}
                language="py"
                aiEnabled={true}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: /get ai suggestion/i }));

        await waitFor(() => {
            expect(screen.getByTestId('ai-suggestion-panel')).toBeInTheDocument();
        });

        const insertButton = screen.getByRole('button', { name: /insert at cursor/i });
        fireEvent.click(insertButton);

        expect(handleChange).toHaveBeenCalledWith('def check():\nreturn True');
        expect(screen.queryByTestId('ai-suggestion-panel')).not.toBeInTheDocument();
    });

    it('dismisses suggestion panel when close button is clicked', async () => {
        mockedAxios.post.mockResolvedValueOnce({
            data: {
                id: 'test-msg-789',
                model: 'claude-sonnet-4-5-20250929',
                choices: [{ index: 0, insert_text: 'int result = 0;', finish_reason: 'stop', score: 0.9 }],
            },
        });

        render(
            <CodeEditorPane
                value="int main() {"
                onChange={vi.fn()}
                language="cpp"
                aiEnabled={false}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: /get ai suggestion/i }));

        await waitFor(() => {
            expect(screen.getByTestId('ai-suggestion-panel')).toBeInTheDocument();
        });

        const dismissBtn = screen.getByLabelText(/dismiss suggestion/i);
        fireEvent.click(dismissBtn);

        expect(screen.queryByTestId('ai-suggestion-panel')).not.toBeInTheDocument();
    });
});
