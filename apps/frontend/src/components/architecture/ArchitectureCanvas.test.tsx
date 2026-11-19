import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ArchitectureCanvas from './ArchitectureCanvas';

// Mock ResizeObserver for jsdom
global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
};

describe('ArchitectureCanvas Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the Architecture canvas header and title', () => {
        render(<ArchitectureCanvas />);

        expect(screen.getByText('LCArena Architecture')).toBeInTheDocument();
        expect(
            screen.getByText('Microservices · Sandboxed Execution · Real-Time WS'),
        ).toBeInTheDocument();
    });

    it('renders all core architecture nodes', () => {
        render(<ArchitectureCanvas />);

        // Verify key components exist in the rendered output
        expect(screen.getByText('React Frontend')).toBeInTheDocument();
        expect(screen.getByText('API Gateway')).toBeInTheDocument();
        expect(screen.getByText('Sockets Service')).toBeInTheDocument();
        expect(screen.getByText('Problem Service')).toBeInTheDocument();
        expect(screen.getByText('Submission Service')).toBeInTheDocument();
        expect(screen.getByText('AI Copilot Service')).toBeInTheDocument();
        expect(screen.getByText('Mail Service')).toBeInTheDocument();
        expect(screen.getByText('RabbitMQ Message Broker')).toBeInTheDocument();
        expect(screen.getByText('Execution Worker')).toBeInTheDocument();
        expect(screen.getByText('Docker Sandbox Engine')).toBeInTheDocument();
        expect(screen.getByText('MongoDB 7 Cluster')).toBeInTheDocument();
        expect(screen.getByText('Redis 7 Cache & Session')).toBeInTheDocument();
        expect(screen.getByText('MinIO / S3 Object Storage')).toBeInTheDocument();
    });

    it('displays ports for microservices and data stores', () => {
        render(<ArchitectureCanvas />);

        expect(screen.getByText('5173')).toBeInTheDocument();
        expect(screen.getByText('3000')).toBeInTheDocument();
        expect(screen.getByText('3007')).toBeInTheDocument();
        expect(screen.getByText('3001')).toBeInTheDocument();
        expect(screen.getByText('3002')).toBeInTheDocument();
        expect(screen.getByText('8000')).toBeInTheDocument();
        expect(screen.getByText('3003')).toBeInTheDocument();
        expect(screen.getByText('27017')).toBeInTheDocument();
        expect(screen.getByText('6379')).toBeInTheDocument();
        expect(screen.getByText('9000 / 9001')).toBeInTheDocument();
    });

    it('allows selecting an architectural flow from the dropdown', () => {
        render(<ArchitectureCanvas />);

        const select = screen.getByRole('combobox');
        fireEvent.change(select, { target: { value: 'flow-submission' } });

        // Verifies the flow banner and stepper appear
        expect(screen.getAllByText('1. End-to-End Submission Pipeline').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText(/Step 1 of 12:/i)).toBeInTheDocument();
        expect(screen.getAllByText('Code Editor Intake').length).toBeGreaterThanOrEqual(1);
    });

    it('allows stepping forward in an active flow', () => {
        render(<ArchitectureCanvas />);

        const select = screen.getByRole('combobox');
        fireEvent.change(select, { target: { value: 'flow-submission' } });

        const nextButton = screen.getByTitle('Next Step');
        fireEvent.click(nextButton);

        expect(screen.getByText(/Step 2 of 12:/i)).toBeInTheDocument();
        expect(screen.getAllByText('Gateway Ingress & Perimeter Guard').length).toBeGreaterThanOrEqual(1);
    });

    it('filters components using the search box', () => {
        render(<ArchitectureCanvas />);

        const searchInput = screen.getByPlaceholderText('Filter node...');
        fireEvent.change(searchInput, { target: { value: 'Docker' } });

        expect(screen.getByText('Docker Sandbox Engine')).toBeInTheDocument();
    });

    it('toggles edit mode on and off', () => {
        render(<ArchitectureCanvas />);

        const editButton = screen.getByTitle('Enter Canvas Edit Mode');
        fireEvent.click(editButton);

        expect(screen.getByText(/Edit Mode Active:/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /add node/i })).toBeInTheDocument();

        // Exit edit mode
        const doneButton = screen.getByTitle('Exit Canvas Edit Mode');
        fireEvent.click(doneButton);

        expect(screen.queryByText(/Edit Mode Active:/i)).not.toBeInTheDocument();
    });
});
