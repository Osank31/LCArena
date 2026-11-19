import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    ReactFlow,
    useReactFlow,
    ReactFlowProvider,
    Controls,
    Background,
    Handle,
    Position,
    MarkerType,
    addEdge,
    useNodesState,
    useEdgesState,
    Node,
    Edge,
    NodeProps,
    Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
    Play,
    Pause,
    X,
    Edit2,
    Trash2,
    Maximize2,
    RefreshCw,
    Plus,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Server,
    Database,
    Shield,
    Workflow,
    Cpu,
    Radio,
    Terminal,
    Sparkles,
    Mail,
    Search,
    Layers,
    ExternalLink,
    CheckCircle2,
    Info,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Design tokens & styling mirroring the LCArena "Paper & Ink" palette
// ---------------------------------------------------------------------------

const NODE_WIDTH = 270;
const NODE_HEIGHT = 110;

type CategoryType = 'all' | 'client' | 'gateway' | 'service' | 'pipeline' | 'storage';

type CustomNodeData = {
    label: string;
    sublabel: string;
    port: string;
    typeLabel: string;
    category: 'client' | 'gateway' | 'service' | 'pipeline' | 'storage';
    tech: string;
    description: string;
    path: string;
    protocol?: string;
    invariants?: string[];
};

const NODE_TYPE_THEMES: Record<
    string,
    { border: string; bg: string; badge: string; badgeBg: string; icon: React.ElementType }
> = {
    Client: {
        border: 'border-ink',
        bg: 'bg-paper',
        badge: 'text-ink',
        badgeBg: 'bg-paper-2 border-rule-2',
        icon: Terminal,
    },
    Gateway: {
        border: 'border-ink-2',
        bg: 'bg-paper-2',
        badge: 'text-ink-2',
        badgeBg: 'bg-paper-3 border-rule',
        icon: Shield,
    },
    Service: {
        border: 'border-rule-2',
        bg: 'bg-paper-3',
        badge: 'text-ink-2',
        badgeBg: 'bg-paper border-rule',
        icon: Server,
    },
    AI: {
        border: 'border-ink-3',
        bg: 'bg-paper',
        badge: 'text-ink',
        badgeBg: 'bg-paper-2 border-rule-2',
        icon: Sparkles,
    },
    Worker: {
        border: 'border-ink-2',
        bg: 'bg-paper-2',
        badge: 'text-ink',
        badgeBg: 'bg-paper border-rule-2',
        icon: Cpu,
    },
    Sandbox: {
        border: 'border-dashed border-ink-3',
        bg: 'bg-paper',
        badge: 'text-ink-2',
        badgeBg: 'bg-paper-3 border-rule',
        icon: Terminal,
    },
    Database: {
        border: 'border-rule-2',
        bg: 'bg-paper-2',
        badge: 'text-ink-2',
        badgeBg: 'bg-paper border-rule',
        icon: Database,
    },
    Cache: {
        border: 'border-rule-2',
        bg: 'bg-paper-2',
        badge: 'text-ink-2',
        badgeBg: 'bg-paper border-rule',
        icon: Layers,
    },
    Queue: {
        border: 'border-ink-2',
        bg: 'bg-paper-2',
        badge: 'text-ink',
        badgeBg: 'bg-paper border-rule-2',
        icon: Workflow,
    },
    Storage: {
        border: 'border-rule-2',
        bg: 'bg-paper-2',
        badge: 'text-ink-2',
        badgeBg: 'bg-paper border-rule',
        icon: Database,
    },
};

// ---------------------------------------------------------------------------
// Node & Edge Identifiers
// ---------------------------------------------------------------------------

export const NODE_IDS = {
    FRONTEND: 'frontend',
    GATEWAY: 'gateway',
    SOCKETS: 'sockets',
    PROBLEM_SERVICE: 'problem-service',
    SUBMISSION_SERVICE: 'submission-service',
    AI_SERVICE: 'ai-service',
    MAIL_SERVICE: 'mail-service',
    RABBITMQ: 'rabbitmq',
    EXECUTION_WORKER: 'execution-worker',
    DOCKER: 'docker',
    MONGODB: 'mongodb',
    REDIS: 'redis',
    MINIO: 'minio',
} as const;

export const EDGE_IDS = {
    FE_TO_GW: 'fe-to-gw',
    FE_TO_WS: 'fe-to-ws',
    FE_TO_AI: 'fe-to-ai',
    GW_TO_PROBLEM: 'gw-to-problem',
    GW_TO_SUBMISSION: 'gw-to-submission',
    GW_TO_MAIL: 'gw-to-mail',
    GW_TO_REDIS: 'gw-to-redis',
    GW_TO_MONGO: 'gw-to-mongo',
    PROBLEM_TO_MONGO: 'problem-to-mongo',
    PROBLEM_TO_MINIO: 'problem-to-minio',
    SUBMISSION_TO_MONGO: 'submission-to-mongo',
    SUBMISSION_TO_RABBITMQ: 'submission-to-rabbitmq',
    RABBITMQ_TO_WORKER: 'rabbitmq-to-worker',
    WORKER_TO_MINIO: 'worker-to-minio',
    WORKER_TO_DOCKER: 'worker-to-docker',
    DOCKER_TO_WORKER: 'docker-to-worker',
    WORKER_TO_MONGO: 'worker-to-mongo',
    WORKER_TO_RABBITMQ: 'worker-to-rabbitmq',
    RABBITMQ_TO_SOCKETS: 'rabbitmq-to-sockets',
    SOCKETS_TO_FE: 'sockets-to-fe',
    MAIL_TO_REDIS: 'mail-to-redis',
} as const;

// ---------------------------------------------------------------------------
// Architectural Flows & Walkthrough Steps
// ---------------------------------------------------------------------------

export type FlowStep = {
    nodeId: string;
    edgeId?: string;
    title: string;
    description: string;
};

export type ArchitectureFlow = {
    id: string;
    label: string;
    description: string;
    nodeIds: string[];
    edgeIds: string[];
    steps: FlowStep[];
};

export const FLOWS: ArchitectureFlow[] = [
    {
        id: 'flow-submission',
        label: '1. End-to-End Submission Pipeline',
        description:
            'Full path from Monaco Editor submission, gateway proxying, RabbitMQ eventing, Docker sandboxing, to real-time WebSocket verdict push.',
        nodeIds: [
            NODE_IDS.FRONTEND,
            NODE_IDS.GATEWAY,
            NODE_IDS.SUBMISSION_SERVICE,
            NODE_IDS.MONGODB,
            NODE_IDS.RABBITMQ,
            NODE_IDS.EXECUTION_WORKER,
            NODE_IDS.MINIO,
            NODE_IDS.DOCKER,
            NODE_IDS.SOCKETS,
        ],
        edgeIds: [
            EDGE_IDS.FE_TO_GW,
            EDGE_IDS.GW_TO_SUBMISSION,
            EDGE_IDS.SUBMISSION_TO_MONGO,
            EDGE_IDS.SUBMISSION_TO_RABBITMQ,
            EDGE_IDS.RABBITMQ_TO_WORKER,
            EDGE_IDS.WORKER_TO_MINIO,
            EDGE_IDS.WORKER_TO_DOCKER,
            EDGE_IDS.DOCKER_TO_WORKER,
            EDGE_IDS.WORKER_TO_MONGO,
            EDGE_IDS.WORKER_TO_RABBITMQ,
            EDGE_IDS.RABBITMQ_TO_SOCKETS,
            EDGE_IDS.SOCKETS_TO_FE,
        ],
        steps: [
            {
                nodeId: NODE_IDS.FRONTEND,
                title: 'Code Editor Intake',
                description:
                    'User writes code in Monaco Editor and clicks "Submit Solution". A POST /api/submissions request is dispatched with Bearer JWT.',
            },
            {
                nodeId: NODE_IDS.GATEWAY,
                edgeId: EDGE_IDS.FE_TO_GW,
                title: 'Gateway Ingress & Perimeter Guard',
                description:
                    'API Gateway cryptographically validates JWT access token, strips client spoof headers (x-user-id), injects verified identity, and proxies downstream.',
            },
            {
                nodeId: NODE_IDS.SUBMISSION_SERVICE,
                edgeId: EDGE_IDS.GW_TO_SUBMISSION,
                title: 'Submission Intake & Initial Record',
                description:
                    'Submission Service receives payload, validates language enum and problem ID, then inserts an initial submission record with status: PENDING into MongoDB.',
            },
            {
                nodeId: NODE_IDS.RABBITMQ,
                edgeId: EDGE_IDS.SUBMISSION_TO_RABBITMQ,
                title: 'Event Publishing (submission.created)',
                description:
                    'Submission Service publishes submission.created event containing code, language, and submissionId onto the RabbitMQ queue.',
            },
            {
                nodeId: NODE_IDS.EXECUTION_WORKER,
                edgeId: EDGE_IDS.RABBITMQ_TO_WORKER,
                title: 'Worker Task Consumption',
                description:
                    'Execution Worker pulls submission.created from RabbitMQ. Initializes an isolated temporary workspace directory for test execution.',
            },
            {
                nodeId: NODE_IDS.MINIO,
                edgeId: EDGE_IDS.WORKER_TO_MINIO,
                title: 'Test-Case Suite Retrieval',
                description:
                    'Worker streams immutable test case suite (input.in / output.ans) from MinIO S3 storage and packs them into a POSIX tar archive for container injection.',
            },
            {
                nodeId: NODE_IDS.DOCKER,
                edgeId: EDGE_IDS.WORKER_TO_DOCKER,
                title: 'Docker Sandbox Execution',
                description:
                    'Worker spawns ephemeral container (gcc/temurin/python/node) with strict CPU, memory, and timeout bounds. Runs runner.sh harness against all test cases.',
            },
            {
                nodeId: NODE_IDS.EXECUTION_WORKER,
                edgeId: EDGE_IDS.DOCKER_TO_WORKER,
                title: 'Verdict Classification & Judging',
                description:
                    'Worker receives container exit codes and stdout/stderr streams. Compares outputs with normalizeOutput policy to determine verdict (SUCCESS, WA, TLE, RE).',
            },
            {
                nodeId: NODE_IDS.MONGODB,
                edgeId: EDGE_IDS.WORKER_TO_MONGO,
                title: 'Verdict Persistence',
                description:
                    'Worker updates the submission document in MongoDB with final verdict, execution timing per test case, and failure diagnostics.',
            },
            {
                nodeId: NODE_IDS.RABBITMQ,
                edgeId: EDGE_IDS.WORKER_TO_RABBITMQ,
                title: 'Event Publishing (submission.completed)',
                description:
                    'Worker broadcasts submission.completed payload to RabbitMQ containing final status, timing, and problem metadata.',
            },
            {
                nodeId: NODE_IDS.SOCKETS,
                edgeId: EDGE_IDS.RABBITMQ_TO_SOCKETS,
                title: 'Socket.io Event Intake',
                description:
                    'Sockets Service consumes submission.completed from RabbitMQ and looks up active connected socket IDs for the target userId in its registry.',
            },
            {
                nodeId: NODE_IDS.FRONTEND,
                edgeId: EDGE_IDS.SOCKETS_TO_FE,
                title: 'Real-Time Browser Update',
                description:
                    'Sockets Service pushes submissionCompleted event via WebSocket directly to client browser. OutputConsole updates instantly with zero polling.',
            },
        ],
    },
    {
        id: 'flow-auth',
        label: '2. Authentication & Session Lifecycle',
        description:
            'Dual-token JWT architecture, Redis session rotation, instant JTI revocation on logout, and RBAC authorization.',
        nodeIds: [NODE_IDS.FRONTEND, NODE_IDS.GATEWAY, NODE_IDS.REDIS, NODE_IDS.MONGODB],
        edgeIds: [EDGE_IDS.FE_TO_GW, EDGE_IDS.GW_TO_REDIS, EDGE_IDS.GW_TO_MONGO],
        steps: [
            {
                nodeId: NODE_IDS.FRONTEND,
                title: 'User Credentials / OTP',
                description: 'User enters email & password or requests passwordless OTP code from React login form.',
            },
            {
                nodeId: NODE_IDS.GATEWAY,
                edgeId: EDGE_IDS.FE_TO_GW,
                title: 'Credential Verification',
                description: 'API Gateway authenticates user credentials against MongoDB (bcrypt cost 10).',
            },
            {
                nodeId: NODE_IDS.REDIS,
                edgeId: EDGE_IDS.GW_TO_REDIS,
                title: 'Session & JTI Management',
                description:
                    'Gateway writes active refresh token to Redis at session:<userId> (7-day TTL). On logout, token JTI is blacklisted at revoked_access:<jti>.',
            },
            {
                nodeId: NODE_IDS.MONGODB,
                edgeId: EDGE_IDS.GW_TO_MONGO,
                title: 'User Profile & Roles',
                description: 'Gateway reads user role (Regular, Admin, Premium) to enforce endpoint RBAC permissions.',
            },
        ],
    },
    {
        id: 'flow-ai',
        label: '3. AI Monaco Autocompletion (Copilot)',
        description:
            'Debounced Fill-In-The-Middle completions via FastAPI and Anthropic Claude Sonnet 4.5 with prompt caching.',
        nodeIds: [NODE_IDS.FRONTEND, NODE_IDS.AI_SERVICE],
        edgeIds: [EDGE_IDS.FE_TO_AI],
        steps: [
            {
                nodeId: NODE_IDS.FRONTEND,
                title: 'Debounced Monaco Trigger',
                description:
                    'User types in Monaco Editor. After 400-550ms idle, cursor context (prefix, suffix, language) is captured. AbortController cancels in-flight requests on new keypress.',
            },
            {
                nodeId: NODE_IDS.AI_SERVICE,
                edgeId: EDGE_IDS.FE_TO_AI,
                title: 'Claude Sonnet 4.5 FIM Inference',
                description:
                    'FastAPI service uses ephemeral prompt caching (cache_control) to cut input tokens by 90% and provides minimal insertion completions in sub-second latency.',
            },
            {
                nodeId: NODE_IDS.FRONTEND,
                edgeId: EDGE_IDS.FE_TO_AI,
                title: 'Inline Ghost Text Render',
                description:
                    'Predicted code snippet is rendered as inline ghost text in Monaco. Pressing Tab accepts the suggestion.',
            },
        ],
    },
    {
        id: 'flow-execution',
        label: '4. Docker Sandboxed Code Execution',
        description:
            'Isolated multi-language execution in ephemeral gcc, temurin, python, and node containers under POSIX test harnesses.',
        nodeIds: [NODE_IDS.EXECUTION_WORKER, NODE_IDS.MINIO, NODE_IDS.DOCKER, NODE_IDS.MONGODB],
        edgeIds: [EDGE_IDS.WORKER_TO_MINIO, EDGE_IDS.WORKER_TO_DOCKER, EDGE_IDS.DOCKER_TO_WORKER, EDGE_IDS.WORKER_TO_MONGO],
        steps: [
            {
                nodeId: NODE_IDS.EXECUTION_WORKER,
                title: 'Harness Generation',
                description:
                    'Worker synthesizes wrapper boilerplate (Solution wrapper) and runner.sh bash test harness with high-resolution date timing.',
            },
            {
                nodeId: NODE_IDS.MINIO,
                edgeId: EDGE_IDS.WORKER_TO_MINIO,
                title: 'Fetch Test Suite',
                description:
                    'Worker pulls problem test cases from MinIO and injects them into the container workspace via tar stream.',
            },
            {
                nodeId: NODE_IDS.DOCKER,
                edgeId: EDGE_IDS.WORKER_TO_DOCKER,
                title: 'Containerized Sandbox Execution',
                description:
                    'Dockerode executes code inside isolated container. Enforces memory limits (512MB) and per-testcase execution timeout (5000ms).',
            },
            {
                nodeId: NODE_IDS.EXECUTION_WORKER,
                edgeId: EDGE_IDS.DOCKER_TO_WORKER,
                title: 'Output Comparison & Normalization',
                description:
                    'Worker runs compareOutputs (normalizing CRLF, trailing whitespace, trailing newlines) to verify correctness against .ans files.',
            },
        ],
    },
    {
        id: 'flow-problems',
        label: '5. Problem Catalog & Test Suite Intake',
        description:
            'Admin problem creation, markdown statement storage, and multi-testcase archive ingestion to MinIO.',
        nodeIds: [NODE_IDS.FRONTEND, NODE_IDS.GATEWAY, NODE_IDS.PROBLEM_SERVICE, NODE_IDS.MONGODB, NODE_IDS.MINIO],
        edgeIds: [EDGE_IDS.FE_TO_GW, EDGE_IDS.GW_TO_PROBLEM, EDGE_IDS.PROBLEM_TO_MONGO, EDGE_IDS.PROBLEM_TO_MINIO],
        steps: [
            {
                nodeId: NODE_IDS.FRONTEND,
                title: 'Admin Problem Editor',
                description:
                    'Admin writes problem description, time limit, and difficulty in Problem Editor UI.',
            },
            {
                nodeId: NODE_IDS.GATEWAY,
                edgeId: EDGE_IDS.FE_TO_GW,
                title: 'Admin Role Verification',
                description:
                    'API Gateway validates caller has UserType.Admin before forwarding POST /api/problems.',
            },
            {
                nodeId: NODE_IDS.PROBLEM_SERVICE,
                edgeId: EDGE_IDS.GW_TO_PROBLEM,
                title: 'Problem Ingestion',
                description:
                    'Problem Service structures problem metadata and assigns unique test-case storage prefix.',
            },
            {
                nodeId: NODE_IDS.MONGODB,
                edgeId: EDGE_IDS.PROBLEM_TO_MONGO,
                title: 'Save Problem Document',
                description: 'Problem description, tags, and limits stored in MongoDB problems collection.',
            },
            {
                nodeId: NODE_IDS.MINIO,
                edgeId: EDGE_IDS.PROBLEM_TO_MINIO,
                title: 'Upload Test-Case Archives',
                description:
                    'Test suites stored under immutable S3 keys: Evaluation_Test_Cases/Test_Cases_<ID>/test_case_XXX/.',
            },
        ],
    },
    {
        id: 'flow-mail',
        label: '6. Mail & Passwordless OTP Dispatch',
        description:
            'Non-blocking background email dispatch with 202 Accepted status and 5-minute Redis OTP TTL.',
        nodeIds: [NODE_IDS.FRONTEND, NODE_IDS.GATEWAY, NODE_IDS.MAIL_SERVICE, NODE_IDS.REDIS],
        edgeIds: [EDGE_IDS.FE_TO_GW, EDGE_IDS.GW_TO_MAIL, EDGE_IDS.MAIL_TO_REDIS],
        steps: [
            {
                nodeId: NODE_IDS.FRONTEND,
                title: 'Request OTP Code',
                description: 'User enters email address for passwordless authentication or email verification.',
            },
            {
                nodeId: NODE_IDS.GATEWAY,
                edgeId: EDGE_IDS.FE_TO_GW,
                title: 'Forward OTP Request',
                description: 'Gateway forwards POST /otp to internal Mail Service (Port 3003).',
            },
            {
                nodeId: NODE_IDS.MAIL_SERVICE,
                edgeId: EDGE_IDS.GW_TO_MAIL,
                title: 'Asynchronous Acceptance (202)',
                description:
                    'Mail Service generates secure 6-digit OTP, responds immediately with 202 Accepted, and queues SMTP delivery.',
            },
            {
                nodeId: NODE_IDS.REDIS,
                edgeId: EDGE_IDS.MAIL_TO_REDIS,
                title: 'Redis Ephemeral Store',
                description:
                    'OTP is stored at otp:<email> with 300s (5m) TTL. Deleted immediately upon successful verification.',
            },
        ],
    },
];

// ---------------------------------------------------------------------------
// Default Graph Layout (Nodes & Edges)
// ---------------------------------------------------------------------------

export const INITIAL_NODES: Node<CustomNodeData>[] = [
    // Column 0: Client Browser UI
    {
        id: NODE_IDS.FRONTEND,
        type: 'customNode',
        position: { x: 50, y: 260 },
        data: {
            label: 'React Frontend',
            sublabel: 'React 18 · Vite · Monaco Editor · KaTeX',
            port: '5173',
            typeLabel: 'Client',
            category: 'client',
            tech: 'React 18 · Vite · TypeScript · Monaco Editor · Tailwind',
            description:
                'Primary user interface. Features resizable split-pane layout, full Monaco code editor with live syntax highlighting and AI completions, KaTeX problem markdown viewer, and real-time WebSocket test evaluation feedback.',
            path: 'apps/frontend',
            protocol: 'HTTP / WebSocket',
            invariants: [
                'Debounced inline autocompletion (400-550ms) with AbortController',
                'Listens to WebSocket submissionCompleted event for instant UI update',
                'Demonstrates demo mode modal with auto backend pinging',
            ],
        },
    },

    // Column 1: Ingress & Gateways
    {
        id: NODE_IDS.GATEWAY,
        type: 'customNode',
        position: { x: 420, y: 120 },
        data: {
            label: 'API Gateway',
            sublabel: 'Reverse proxy · Auth · JTI Blacklist · RBAC',
            port: '3000',
            typeLabel: 'Gateway',
            category: 'gateway',
            tech: 'Express 4 · TypeScript · http-proxy-middleware · ioredis',
            description:
                'Perimeter security boundary and single public HTTP ingress point. Handles dual-token authentication (15m JWT, 7d refresh token in Redis), strips spoofed client headers, injects verified x-user-id, and enforces fail-closed proxy routing.',
            path: 'apps/apis/gateway',
            protocol: 'HTTP / REST',
            invariants: [
                'Fails closed: unmapped routes immediately return JSON 404',
                'Strips client x-user-id and injects cryptographically verified userId',
                'Rotates refresh tokens on /auth/refresh and instantly blacklists revoked JTIs',
            ],
        },
    },
    {
        id: NODE_IDS.SOCKETS,
        type: 'customNode',
        position: { x: 420, y: 390 },
        data: {
            label: 'Sockets Service',
            sublabel: 'Socket.io · Real-time event push engine',
            port: '3007',
            typeLabel: 'Gateway',
            category: 'gateway',
            tech: 'Socket.io · TypeScript · amqplib (RabbitMQ)',
            description:
                'Real-time WebSocket notification hub. Maintains in-memory userSockets: Map<userId, Set<socketId>> registry. Consumes submission.completed from RabbitMQ and pushes instant submissionCompleted events directly to target browser tabs.',
            path: 'apps/apis/sockets',
            protocol: 'WebSocket / Socket.io',
            invariants: [
                'Tracks multi-tab socket connections per authenticated user',
                'Consumes RabbitMQ submission.completed and fanouts to active client sockets',
                'No polling required by the frontend client',
            ],
        },
    },

    // Column 2: Domain Microservices
    {
        id: NODE_IDS.PROBLEM_SERVICE,
        type: 'customNode',
        position: { x: 800, y: 40 },
        data: {
            label: 'Problem Service',
            sublabel: 'Problem catalog · Markdown specs · Test cases',
            port: '3001',
            typeLabel: 'Service',
            category: 'service',
            tech: 'Express 4 · TypeScript · Mongoose · AWS SDK v3 (S3)',
            description:
                'Core domain service managing the competitive programming problem catalog, markdown descriptions, difficulty levels, sample test cases, and test case suite metadata in MinIO/S3.',
            path: 'apps/apis/problem',
            protocol: 'HTTP / REST',
            invariants: [
                'Public endpoints for listing and viewing problem statements',
                'Admin-guarded mutation endpoints (POST, PUT, DELETE)',
                'Configures testCaseStoragePrefix for immutable MinIO test suites',
            ],
        },
    },
    {
        id: NODE_IDS.SUBMISSION_SERVICE,
        type: 'customNode',
        position: { x: 800, y: 180 },
        data: {
            label: 'Submission Service',
            sublabel: 'Intake · PENDING record · Event producer',
            port: '3002',
            typeLabel: 'Service',
            category: 'service',
            tech: 'Express 4 · TypeScript · Mongoose · amqplib (RabbitMQ)',
            description:
                'Ingress point for user code submissions. Validates verified x-user-id header from gateway, inserts an initial PENDING submission into MongoDB, and publishes submission.created event to RabbitMQ for asynchronous worker evaluation.',
            path: 'apps/apis/submission',
            protocol: 'HTTP / REST',
            invariants: [
                'Requires verified x-user-id header injected by API Gateway',
                'Saves submission with status: { status: "PENDING" }',
                'Publishes submission.created event with submissionId, code, and language',
            ],
        },
    },
    {
        id: NODE_IDS.AI_SERVICE,
        type: 'customNode',
        position: { x: 800, y: 320 },
        data: {
            label: 'AI Copilot Service',
            sublabel: 'FastAPI · Claude Sonnet 4.5 · FIM Completion',
            port: '8000',
            typeLabel: 'AI',
            category: 'service',
            tech: 'FastAPI · Python 3.11 · Anthropic Claude Sonnet 4.5 · LangChain',
            description:
                'Intelligent code autocompletion engine for Monaco Editor. Performs Fill-In-The-Middle (FIM) inference using Anthropic Claude Sonnet 4.5 with ephemeral prompt caching, inference token capping, and sub-second latency.',
            path: 'apps/apis/ai-suggestion-service',
            protocol: 'HTTP / REST',
            invariants: [
                'Ephemeral prompt caching cuts input tokens by ~90%',
                'Strict max_tokens cap (256) prevents runaway completion latency',
                'Fast-paths empty/whitespace contexts to 0 LLM calls',
            ],
        },
    },
    {
        id: NODE_IDS.MAIL_SERVICE,
        type: 'customNode',
        position: { x: 800, y: 460 },
        data: {
            label: 'Mail Service',
            sublabel: 'Nodemailer · OTP async dispatch (202 Accepted)',
            port: '3003',
            typeLabel: 'Service',
            category: 'service',
            tech: 'Express 4 · TypeScript · Nodemailer · ioredis',
            description:
                'Transactional email service. Dispatches 6-digit numeric OTP verification codes for email registration and passwordless login. POST /otp returns 202 Accepted immediately, executing SMTP delivery in the background.',
            path: 'apps/apis/mail',
            protocol: 'HTTP / REST',
            invariants: [
                'POST /otp returns 202 Accepted immediately and runs SMTP in background',
                'Stores OTP in Redis with 5-minute (300s) TTL',
                'Guarantees non-blocking authentication endpoints',
            ],
        },
    },

    // Column 3: Asynchronous Pipeline & Execution
    {
        id: NODE_IDS.RABBITMQ,
        type: 'customNode',
        position: { x: 1180, y: 180 },
        data: {
            label: 'RabbitMQ Message Broker',
            sublabel: 'submission.created & submission.completed queues',
            port: '5672 / 15672',
            typeLabel: 'Queue',
            category: 'pipeline',
            tech: 'RabbitMQ 3.13 · AMQP 0-9-1',
            description:
                'High-reliability message broker decoupling synchronous user submission ingestion from compute-intensive Docker sandboxing. Queues include submission.created (worker tasks) and submission.completed (socket fanout).',
            path: 'packages/backend/config',
            protocol: 'AMQP 0-9-1',
            invariants: [
                'Decouples HTTP gateway throughput from Docker container limits',
                'Ensures durable message delivery and automatic worker retry',
                'Web management console available at :15672',
            ],
        },
    },
    {
        id: NODE_IDS.EXECUTION_WORKER,
        type: 'customNode',
        position: { x: 1180, y: 340 },
        data: {
            label: 'Execution Worker',
            sublabel: 'Consumer · Docker harness · Verdict judge',
            port: '3004 (/health)',
            typeLabel: 'Worker',
            category: 'pipeline',
            tech: 'Node.js · TypeScript · Dockerode · tar-stream · compareOutputs',
            description:
                'Evaluation worker consuming submission.created. Downloads immutable test suite from MinIO, synthesizes language wrappers and runner.sh bash test harness, executes code in Docker sandbox, evaluates outputs via compareOutputs, updates MongoDB, and publishes submission.completed.',
            path: 'packages/backend/execution',
            protocol: 'AMQP / Docker Socket',
            invariants: [
                'Guaranteed container cleanup in finally block',
                'Measures execution time with date +%s%N high-resolution timing',
                'Output comparison normalizes CRLF and trailing whitespace tokens',
            ],
        },
    },
    {
        id: NODE_IDS.DOCKER,
        type: 'customNode',
        position: { x: 1180, y: 500 },
        data: {
            label: 'Docker Sandbox Engine',
            sublabel: 'gcc:latest · temurin · python:3.11 · node:20',
            port: 'Host Socket',
            typeLabel: 'Sandbox',
            category: 'pipeline',
            tech: 'Docker Engine API · Linux Namespaces · Cgroups',
            description:
                'Ephemeral container sandboxes providing secure execution of untrusted code. Features language runners for C++17 (gcc), Java 21 (temurin), Python 3.11, and JavaScript (node:20) with strict memory bounds (512MB) and execution timeouts.',
            path: 'packages/backend/execution',
            protocol: 'Docker Engine Socket',
            invariants: [
                'Container isolated with no root host mount or privileged access',
                'Strict memory and execution wall-clock limits per test case',
                'Runs runner.sh checking exit code 124 (TLE), != 0 (RE), and diff (WA)',
            ],
        },
    },

    // Column 4: Storage & State Infrastructure
    {
        id: NODE_IDS.MONGODB,
        type: 'customNode',
        position: { x: 1560, y: 50 },
        data: {
            label: 'MongoDB 7 Cluster',
            sublabel: 'Users · Problems · Submissions collections',
            port: '27017',
            typeLabel: 'Database',
            category: 'storage',
            tech: 'MongoDB 7 · Mongoose ODM',
            description:
                'Primary document store. Houses user accounts (bcrypt hashed credentials), problem descriptions with difficulty and time limits, and submissions with execution logs and per-testcase timing metrics.',
            path: 'packages/backend/models',
            protocol: 'MongoDB Wire Protocol',
            invariants: [
                'Users collection stores bcrypt hashed passwords and role expiry',
                'Problems collection stores raw markdown and testCaseStoragePrefix',
                'Submissions collection stores execution results union (SUCCESS/WA/TLE/RE)',
            ],
        },
    },
    {
        id: NODE_IDS.REDIS,
        type: 'customNode',
        position: { x: 1560, y: 200 },
        data: {
            label: 'Redis 7 Cache & Session',
            sublabel: 'session:<userId> · revoked_access:<jti> · OTP',
            port: '6379',
            typeLabel: 'Cache',
            category: 'storage',
            tech: 'Redis 7 · ioredis',
            description:
                'In-memory high speed database. Enforces refresh token session rotation (7-day TTL at session:<userId>), instant access token revocation blacklist (revoked_access:<jti>), and single-use 5-minute OTP codes (otp:<email>).',
            path: 'packages/backend/config',
            protocol: 'Redis RESP',
            invariants: [
                'session:<userId> tracks active refresh token for rotation',
                'revoked_access:<jti> stores logged-out JWTs until natural expiry',
                'otp:<email> stores 6-digit numeric verification codes with 300s TTL',
            ],
        },
    },
    {
        id: NODE_IDS.MINIO,
        type: 'customNode',
        position: { x: 1560, y: 360 },
        data: {
            label: 'MinIO / S3 Object Storage',
            sublabel: 'Immutable test suites: test_case_XXX/input.in, output.ans',
            port: '9000 / 9001',
            typeLabel: 'Storage',
            category: 'storage',
            tech: 'MinIO S3 Compatible Object Storage · AWS SDK v3',
            description:
                'S3-compatible object storage holding evaluation test case suites. Structured hierarchically under Evaluation_Test_Cases/Test_Cases_<PROBLEM_ID>/test_case_XXX/input.in and output.ans, streamed verbatim to worker containers.',
            path: 'packages/backend/config',
            protocol: 'HTTP / S3 REST',
            invariants: [
                'Input and output files preserved verbatim including whitespace and newlines',
                'Zero-padded 3-digit folder numbering (test_case_001, test_case_002)',
                'Web management console at :9001 (minioadmin / minioadmin)',
            ],
        },
    },
];

export const INITIAL_EDGES: Edge[] = [
    // Client Ingress
    {
        id: EDGE_IDS.FE_TO_GW,
        source: NODE_IDS.FRONTEND,
        target: NODE_IDS.GATEWAY,
        label: 'HTTP / REST (:3000)',
        animated: false,
        style: { stroke: '#211e19', strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#211e19', width: 14, height: 14 },
    },
    {
        id: EDGE_IDS.FE_TO_WS,
        source: NODE_IDS.FRONTEND,
        target: NODE_IDS.SOCKETS,
        label: 'WebSocket Handshake (:3007)',
        animated: false,
        style: { stroke: '#3d382f', strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#3d382f', width: 14, height: 14 },
    },
    {
        id: EDGE_IDS.FE_TO_AI,
        source: NODE_IDS.FRONTEND,
        target: NODE_IDS.AI_SERVICE,
        label: 'Debounced /suggestions (:8000)',
        animated: false,
        style: { stroke: '#6b6151', strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#6b6151', width: 14, height: 14 },
    },

    // Gateway to Services
    {
        id: EDGE_IDS.GW_TO_PROBLEM,
        source: NODE_IDS.GATEWAY,
        target: NODE_IDS.PROBLEM_SERVICE,
        label: 'Reverse Proxy [x-user-id]',
        animated: false,
        style: { stroke: '#6b6151', strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#6b6151', width: 14, height: 14 },
    },
    {
        id: EDGE_IDS.GW_TO_SUBMISSION,
        source: NODE_IDS.GATEWAY,
        target: NODE_IDS.SUBMISSION_SERVICE,
        label: 'Reverse Proxy [x-user-id]',
        animated: false,
        style: { stroke: '#211e19', strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#211e19', width: 14, height: 14 },
    },
    {
        id: EDGE_IDS.GW_TO_MAIL,
        source: NODE_IDS.GATEWAY,
        target: NODE_IDS.MAIL_SERVICE,
        label: 'POST /otp (202 Accepted)',
        animated: false,
        style: { stroke: '#6b6151', strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#6b6151', width: 14, height: 14 },
    },
    {
        id: EDGE_IDS.GW_TO_REDIS,
        source: NODE_IDS.GATEWAY,
        target: NODE_IDS.REDIS,
        label: 'Session & JTI Revocation',
        animated: false,
        style: { stroke: '#6b6151', strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#6b6151', width: 14, height: 14 },
    },
    {
        id: EDGE_IDS.GW_TO_MONGO,
        source: NODE_IDS.GATEWAY,
        target: NODE_IDS.MONGODB,
        label: 'User Auth & Role',
        animated: false,
        style: { stroke: '#6b6151', strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#6b6151', width: 14, height: 14 },
    },

    // Services to Data & Event Mesh
    {
        id: EDGE_IDS.PROBLEM_TO_MONGO,
        source: NODE_IDS.PROBLEM_SERVICE,
        target: NODE_IDS.MONGODB,
        label: 'Problem CRUD & Metadata',
        animated: false,
        style: { stroke: '#c6b79c', strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#6b6151', width: 14, height: 14 },
    },
    {
        id: EDGE_IDS.PROBLEM_TO_MINIO,
        source: NODE_IDS.PROBLEM_SERVICE,
        target: NODE_IDS.MINIO,
        label: 'Upload Test Suite',
        animated: false,
        style: { stroke: '#c6b79c', strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#6b6151', width: 14, height: 14 },
    },
    {
        id: EDGE_IDS.SUBMISSION_TO_MONGO,
        source: NODE_IDS.SUBMISSION_SERVICE,
        target: NODE_IDS.MONGODB,
        label: 'Insert PENDING submission',
        animated: false,
        style: { stroke: '#c6b79c', strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#6b6151', width: 14, height: 14 },
    },
    {
        id: EDGE_IDS.SUBMISSION_TO_RABBITMQ,
        source: NODE_IDS.SUBMISSION_SERVICE,
        target: NODE_IDS.RABBITMQ,
        label: 'Publish submission.created',
        animated: true,
        style: { stroke: '#211e19', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#211e19', width: 16, height: 16 },
    },
    {
        id: EDGE_IDS.MAIL_TO_REDIS,
        source: NODE_IDS.MAIL_SERVICE,
        target: NODE_IDS.REDIS,
        label: 'Store OTP (5m TTL)',
        animated: false,
        style: { stroke: '#c6b79c', strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#6b6151', width: 14, height: 14 },
    },

    // Execution Pipeline
    {
        id: EDGE_IDS.RABBITMQ_TO_WORKER,
        source: NODE_IDS.RABBITMQ,
        target: NODE_IDS.EXECUTION_WORKER,
        label: 'Consume Task',
        animated: true,
        style: { stroke: '#211e19', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#211e19', width: 16, height: 16 },
    },
    {
        id: EDGE_IDS.WORKER_TO_MINIO,
        source: NODE_IDS.EXECUTION_WORKER,
        target: NODE_IDS.MINIO,
        label: 'Fetch input.in & output.ans',
        animated: false,
        style: { stroke: '#6b6151', strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#6b6151', width: 14, height: 14 },
    },
    {
        id: EDGE_IDS.WORKER_TO_DOCKER,
        source: NODE_IDS.EXECUTION_WORKER,
        target: NODE_IDS.DOCKER,
        label: 'Run runner.sh',
        animated: true,
        style: { stroke: '#211e19', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#211e19', width: 16, height: 16 },
    },
    {
        id: EDGE_IDS.DOCKER_TO_WORKER,
        source: NODE_IDS.DOCKER,
        target: NODE_IDS.EXECUTION_WORKER,
        label: 'Exit code & Stdout',
        animated: false,
        style: { stroke: '#6b6151', strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#6b6151', width: 14, height: 14 },
    },
    {
        id: EDGE_IDS.WORKER_TO_MONGO,
        source: NODE_IDS.EXECUTION_WORKER,
        target: NODE_IDS.MONGODB,
        label: 'Update status: SUCCESS / WA / TLE',
        animated: false,
        style: { stroke: '#6b6151', strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#6b6151', width: 14, height: 14 },
    },
    {
        id: EDGE_IDS.WORKER_TO_RABBITMQ,
        source: NODE_IDS.EXECUTION_WORKER,
        target: NODE_IDS.RABBITMQ,
        label: 'Publish submission.completed',
        animated: true,
        style: { stroke: '#211e19', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#211e19', width: 16, height: 16 },
    },

    // Real-Time Notification Loop Back
    {
        id: EDGE_IDS.RABBITMQ_TO_SOCKETS,
        source: NODE_IDS.RABBITMQ,
        target: NODE_IDS.SOCKETS,
        label: 'Consume completed event',
        animated: true,
        style: { stroke: '#211e19', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#211e19', width: 16, height: 16 },
    },
    {
        id: EDGE_IDS.SOCKETS_TO_FE,
        source: NODE_IDS.SOCKETS,
        target: NODE_IDS.FRONTEND,
        label: 'Push submissionCompleted',
        animated: true,
        style: { stroke: '#211e19', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#211e19', width: 16, height: 16 },
    },
];

// ---------------------------------------------------------------------------
// Highlight Context for custom nodes & edges
// ---------------------------------------------------------------------------

interface FlowContextType {
    selectedFlow: string | null;
    highlightedNodeIds: Set<string>;
    activeStepNodeId: string | null;
    searchQuery: string;
    activeCategory: CategoryType;
}

const FlowContext = createContext<FlowContextType>({
    selectedFlow: null,
    highlightedNodeIds: new Set(),
    activeStepNodeId: null,
    searchQuery: '',
    activeCategory: 'all',
});

// ---------------------------------------------------------------------------
// Custom Node Component
// ---------------------------------------------------------------------------

const ArchitectureNode: React.FC<NodeProps<Node<CustomNodeData>>> = React.memo(({ id, data, selected }) => {
    const { label, sublabel, port, typeLabel, category, tech } = data;
    const { selectedFlow, highlightedNodeIds, activeStepNodeId, searchQuery, activeCategory } =
        useContext(FlowContext);

    const theme = NODE_TYPE_THEMES[typeLabel] ?? NODE_TYPE_THEMES.Service;
    const IconComponent = theme.icon;

    // Determine highlight / dim state
    const matchesCategory = activeCategory === 'all' || category === activeCategory;
    const matchesSearch =
        !searchQuery ||
        label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sublabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tech.toLowerCase().includes(searchQuery.toLowerCase()) ||
        port.toLowerCase().includes(searchQuery.toLowerCase());

    const isInFlow = !selectedFlow || highlightedNodeIds.has(id);
    const isStepActive = activeStepNodeId === id;
    const isDimmed = (!isInFlow || !matchesCategory || !matchesSearch) && !isStepActive;

    return (
        <div
            className={`group relative rounded-md p-3 flex flex-col gap-1.5 transition-all duration-200 select-none border ${
                theme.border
            } ${theme.bg} ${
                isStepActive
                    ? 'ring-4 ring-ink scale-[1.05] z-30 shadow-xl bg-paper-3'
                    : selected
                    ? 'ring-2 ring-ink scale-[1.02] z-20 shadow-lg'
                    : isInFlow && selectedFlow
                    ? 'ring-2 ring-ink-2/60 shadow-md z-10'
                    : 'shadow-sm hover:shadow-md'
            } ${isDimmed ? 'opacity-30 grayscale-[60%]' : 'opacity-100'}`}
            style={{ width: NODE_WIDTH, minHeight: NODE_HEIGHT }}
        >
            {/* Top row: Type badge, Port pill, Live dot */}
            <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5">
                    <span
                        className={`inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded ${theme.badgeBg} ${theme.badge}`}
                    >
                        <IconComponent className="w-2.5 h-2.5" />
                        <span>{typeLabel}</span>
                    </span>
                    <span className="text-[10px] font-mono text-ink-3 border border-rule-2 rounded px-1.5 py-0.5 bg-paper/60">
                        {port}
                    </span>
                </div>

                <div className="flex items-center gap-1">
                    {isStepActive && (
                        <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ink opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-ink"></span>
                        </span>
                    )}
                    <span className="w-1.5 h-1.5 rounded-full bg-ink-3/40 group-hover:bg-ink transition-colors" />
                </div>
            </div>

            {/* Service Title */}
            <div className="text-sm font-serif font-bold text-ink leading-tight tracking-tight">
                {label}
            </div>

            {/* Sublabel / Technical role */}
            <div className="text-[10.5px] text-ink-3 leading-snug font-sans">
                {sublabel}
            </div>

            {/* Handles: multi-directional routing */}
            {/* Left Handles */}
            <Handle
                type="target"
                position={Position.Left}
                id="left-target"
                className="!w-2.5 !h-2.5 !bg-ink-3 !border-2 !border-paper hover:!bg-ink transition"
            />
            <Handle
                type="source"
                position={Position.Left}
                id="left-source"
                className="!w-2.5 !h-2.5 !bg-ink !border-2 !border-paper hover:!bg-ink-2 transition"
            />

            {/* Right Handles */}
            <Handle
                type="source"
                position={Position.Right}
                id="right-source"
                className="!w-2.5 !h-2.5 !bg-ink !border-2 !border-paper hover:!bg-ink-2 transition"
            />
            <Handle
                type="target"
                position={Position.Right}
                id="right-target"
                className="!w-2.5 !h-2.5 !bg-ink-3 !border-2 !border-paper hover:!bg-ink transition"
            />

            {/* Top / Bottom Handles */}
            <Handle
                type="target"
                position={Position.Top}
                id="top-target"
                className="!w-2.5 !h-2.5 !bg-ink-3 !border-2 !border-paper hover:!bg-ink transition"
            />
            <Handle
                type="source"
                position={Position.Bottom}
                id="bottom-source"
                className="!w-2.5 !h-2.5 !bg-ink !border-2 !border-paper hover:!bg-ink-2 transition"
            />
        </div>
    );
});

ArchitectureNode.displayName = 'ArchitectureNode';

const nodeTypes = {
    customNode: ArchitectureNode,
};

// ---------------------------------------------------------------------------
// Main Flow Canvas Component
// ---------------------------------------------------------------------------

function FlowCanvas() {
    const [nodes, setNodes, onNodesChange] = useNodesState<Node<CustomNodeData>>(INITIAL_NODES);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(INITIAL_EDGES);

    const { fitView, setCenter, getZoom, zoomTo } = useReactFlow();

    // UI state
    const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);
    const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [activeCategory, setActiveCategory] = useState<CategoryType>('all');
    const [editMode, setEditMode] = useState<boolean>(false);
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
    const [editLabel, setEditLabel] = useState<string>('');
    const [editSublabel, setEditSublabel] = useState<string>('');
    const [showInfoBanner, setShowInfoBanner] = useState<boolean>(true);

    const activeFlow = useMemo(() => {
        return FLOWS.find((f) => f.id === selectedFlowId) ?? null;
    }, [selectedFlowId]);

    const highlightedNodeIds = useMemo(() => {
        if (!activeFlow) return new Set<string>();
        return new Set(activeFlow.nodeIds);
    }, [activeFlow]);

    const highlightedEdgeIds = useMemo(() => {
        if (!activeFlow) return new Set<string>();
        return new Set(activeFlow.edgeIds);
    }, [activeFlow]);

    const activeStep = useMemo(() => {
        if (!activeFlow || activeFlow.steps.length === 0) return null;
        return activeFlow.steps[currentStepIndex] ?? activeFlow.steps[0];
    }, [activeFlow, currentStepIndex]);

    const activeStepNodeId = activeStep?.nodeId ?? null;
    const activeStepEdgeId = activeStep?.edgeId ?? null;

    // Auto-fit on initial mount
    useEffect(() => {
        const timer = setTimeout(() => {
            fitView({ padding: 0.15, duration: 600 });
        }, 150);
        return () => clearTimeout(timer);
    }, [fitView]);

    // Update edge styles when flow changes
    useEffect(() => {
        setEdges((eds) =>
            eds.map((edge) => {
                if (!activeFlow) {
                    const isDefaultAnimated =
                        edge.id === EDGE_IDS.SUBMISSION_TO_RABBITMQ ||
                        edge.id === EDGE_IDS.RABBITMQ_TO_WORKER ||
                        edge.id === EDGE_IDS.WORKER_TO_DOCKER ||
                        edge.id === EDGE_IDS.WORKER_TO_RABBITMQ ||
                        edge.id === EDGE_IDS.RABBITMQ_TO_SOCKETS ||
                        edge.id === EDGE_IDS.SOCKETS_TO_FE;
                    return {
                        ...edge,
                        animated: isDefaultAnimated,
                        style: {
                            stroke: isDefaultAnimated ? '#211e19' : '#6b6151',
                            strokeWidth: isDefaultAnimated ? 2 : 1.5,
                            opacity: 1,
                        },
                        markerEnd: {
                            type: MarkerType.ArrowClosed,
                            color: isDefaultAnimated ? '#211e19' : '#6b6151',
                            width: 14,
                            height: 14,
                        },
                    };
                }

                const isInFlow = highlightedEdgeIds.has(edge.id);
                const isStepEdge = activeStepEdgeId === edge.id;

                if (isStepEdge) {
                    return {
                        ...edge,
                        animated: true,
                        style: {
                            stroke: '#211e19',
                            strokeWidth: 3.5,
                            opacity: 1,
                        },
                        markerEnd: {
                            type: MarkerType.ArrowClosed,
                            color: '#211e19',
                            width: 18,
                            height: 18,
                        },
                    };
                }

                if (isInFlow) {
                    return {
                        ...edge,
                        animated: true,
                        style: {
                            stroke: '#211e19',
                            strokeWidth: 2,
                            opacity: 1,
                        },
                        markerEnd: {
                            type: MarkerType.ArrowClosed,
                            color: '#211e19',
                            width: 15,
                            height: 15,
                        },
                    };
                }

                return {
                    ...edge,
                    animated: false,
                    style: {
                        stroke: '#c6b79c',
                        strokeWidth: 1,
                        opacity: 0.2,
                    },
                    markerEnd: {
                        type: MarkerType.ArrowClosed,
                        color: '#c6b79c',
                        width: 12,
                        height: 12,
                    },
                };
            }),
        );
    }, [activeFlow, highlightedEdgeIds, activeStepEdgeId, setEdges]);

    // Auto-step player timer
    useEffect(() => {
        if (!isPlaying || !activeFlow) return;

        const interval = setInterval(() => {
            setCurrentStepIndex((prev) => {
                if (prev >= activeFlow.steps.length - 1) {
                    setIsPlaying(false);
                    return 0;
                }
                return prev + 1;
            });
        }, 2800);

        return () => clearInterval(interval);
    }, [isPlaying, activeFlow]);

    // Pan canvas towards the active step node
    useEffect(() => {
        if (!activeStepNodeId) return;
        const targetNode = nodes.find((n) => n.id === activeStepNodeId);
        if (targetNode) {
            setCenter(targetNode.position.x + NODE_WIDTH / 2, targetNode.position.y + NODE_HEIGHT / 2, {
                duration: 500,
                zoom: Math.max(0.85, getZoom()),
            });
        }
    }, [activeStepNodeId, nodes, setCenter, getZoom]);

    // Handlers
    const handleFlowSelect = useCallback((flowId: string | null) => {
        setSelectedFlowId(flowId);
        setCurrentStepIndex(0);
        setIsPlaying(false);
    }, []);

    const handleNodeClick = useCallback(
        (_event: React.MouseEvent, node: Node) => {
            if (editMode) {
                setEditingNodeId(node.id);
                const d = node.data as CustomNodeData;
                setEditLabel(d.label);
                setEditSublabel(d.sublabel);
            } else {
                setSelectedNodeId(node.id);
            }
        },
        [editMode],
    );

    const handlePaneClick = useCallback(() => {
        setSelectedNodeId(null);
    }, []);

    const handleConnect = useCallback(
        (connection: Connection) => {
            setEdges((eds) =>
                addEdge(
                    {
                        ...connection,
                        id: `edge-${Date.now()}`,
                        animated: true,
                        style: { stroke: '#211e19', strokeWidth: 2 },
                        markerEnd: { type: MarkerType.ArrowClosed, color: '#211e19', width: 14, height: 14 },
                    },
                    eds,
                ),
            );
        },
        [setEdges],
    );

    const handleResetView = useCallback(() => {
        fitView({ padding: 0.15, duration: 600 });
    }, [fitView]);

    const handleResetToDefaultLayout = useCallback(() => {
        setNodes(INITIAL_NODES);
        setEdges(INITIAL_EDGES);
        setSelectedFlowId(null);
        setSelectedNodeId(null);
        fitView({ padding: 0.15, duration: 600 });
    }, [setNodes, setEdges, fitView]);

    const handleAddNode = useCallback(() => {
        const id = `custom-${Date.now()}`;
        const newNode: Node<CustomNodeData> = {
            id,
            type: 'customNode',
            position: { x: 800, y: 600 },
            data: {
                label: 'New Component',
                sublabel: 'User added architecture node',
                port: '—',
                typeLabel: 'Service',
                category: 'service',
                tech: 'Custom microservice',
                description: 'User-configured component added in Edit Mode.',
                path: 'apps/custom',
            },
        };
        setNodes((nds) => [...nds, newNode]);
        setEditingNodeId(id);
        setEditLabel('New Component');
        setEditSublabel('User added architecture node');
    }, [setNodes]);

    const handleDeleteEditingNode = useCallback(() => {
        if (!editingNodeId) return;
        setNodes((nds) => nds.filter((n) => n.id !== editingNodeId));
        setEdges((eds) => eds.filter((e) => e.source !== editingNodeId && e.target !== editingNodeId));
        setEditingNodeId(null);
    }, [editingNodeId, setNodes, setEdges]);

    const handleSaveNodeEdit = useCallback(() => {
        if (!editingNodeId) return;
        setNodes((nds) =>
            nds.map((n) =>
                n.id === editingNodeId
                    ? {
                          ...n,
                          data: {
                              ...n.data,
                              label: editLabel,
                              sublabel: editSublabel,
                          },
                      }
                    : n,
            ),
        );
        setEditingNodeId(null);
    }, [editingNodeId, editLabel, editSublabel, setNodes]);

    const selectedNodeObj = useMemo(() => {
        if (!selectedNodeId) return null;
        return nodes.find((n) => n.id === selectedNodeId) ?? null;
    }, [selectedNodeId, nodes]);

    const contextValue = useMemo<FlowContextType>(
        () => ({
            selectedFlow: selectedFlowId,
            highlightedNodeIds,
            activeStepNodeId,
            searchQuery,
            activeCategory,
        }),
        [selectedFlowId, highlightedNodeIds, activeStepNodeId, searchQuery, activeCategory],
    );

    return (
        <FlowContext.Provider value={contextValue}>
            <div className="flex flex-col w-full h-[calc(100vh-3.5rem)] bg-paper text-ink relative overflow-hidden select-none">
                {/* -----------------------------------------------------------
                    Top Control Bar
                ----------------------------------------------------------- */}
                <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 border-b border-rule bg-paper-2/70 backdrop-blur shrink-0 z-20">
                    {/* Brand & Live status */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-ink animate-pulse" />
                            <h1 className="font-serif font-bold text-ink text-base md:text-lg tracking-tight">
                                LCArena Architecture
                            </h1>
                        </div>
                        <span className="hidden sm:inline-block text-[11px] font-mono text-ink-3 border border-rule-2 rounded px-2 py-0.5 bg-paper/70">
                            Microservices · Sandboxed Execution · Real-Time WS
                        </span>
                    </div>

                    {/* Middle: Flow Selector & Categories */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Flow Dropdown */}
                        <div className="relative min-w-[240px]">
                            <select
                                value={selectedFlowId ?? ''}
                                onChange={(e) => handleFlowSelect(e.target.value || null)}
                                className="w-full bg-paper border border-rule-2 rounded-sm px-3 py-1.5 text-xs text-ink font-mono focus:outline-none focus:border-ink cursor-pointer pr-8 shadow-sm"
                            >
                                <option value="">★ Complete System Topology (All)</option>
                                {FLOWS.map((f) => (
                                    <option key={f.id} value={f.id}>
                                        {f.label}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-ink-3 pointer-events-none" />
                        </div>

                        {/* Search input */}
                        <div className="relative hidden lg:block w-44">
                            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-ink-3" />
                            <input
                                type="text"
                                placeholder="Filter node..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-paper border border-rule-2 rounded-sm pl-8 pr-2.5 py-1.5 text-xs text-ink font-mono focus:outline-none focus:border-ink placeholder:text-ink-3/60"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2 top-2 text-ink-3 hover:text-ink"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>

                        {/* Category filter pills */}
                        <div className="hidden xl:flex items-center gap-1 border border-rule-2 rounded-sm bg-paper p-0.5 text-[11px] font-mono">
                            {(
                                [
                                    { id: 'all', label: 'All (13)' },
                                    { id: 'gateway', label: 'Edge/Gateways' },
                                    { id: 'service', label: 'Services' },
                                    { id: 'pipeline', label: 'Workers/Sandbox' },
                                    { id: 'storage', label: 'Databases' },
                                ] as const
                            ).map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveCategory(cat.id)}
                                    className={`px-2 py-1 rounded-sm transition ${
                                        activeCategory === cat.id
                                            ? 'bg-ink text-paper font-semibold'
                                            : 'text-ink-3 hover:text-ink hover:bg-paper-2'
                                    }`}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Right side: Viewport & Edit Controls */}
                    <div className="flex items-center gap-2">
                        {/* Zoom & Fit controls */}
                        <div className="flex items-center border border-rule-2 rounded-sm bg-paper divide-x divide-rule shadow-sm">
                            <button
                                onClick={() => zoomTo(Math.max(0.3, getZoom() - 0.2))}
                                className="px-2 py-1 text-ink-2 hover:text-ink hover:bg-paper-2 text-xs font-mono transition"
                                title="Zoom Out"
                            >
                                -
                            </button>
                            <button
                                onClick={handleResetView}
                                className="flex items-center gap-1 px-2.5 py-1 text-ink-2 hover:text-ink hover:bg-paper-2 text-xs font-mono transition"
                                title="Fit View to Screen"
                            >
                                <Maximize2 className="w-3 h-3" />
                                <span className="hidden sm:inline">Fit</span>
                            </button>
                            <button
                                onClick={() => zoomTo(Math.min(2.0, getZoom() + 0.2))}
                                className="px-2 py-1 text-ink-2 hover:text-ink hover:bg-paper-2 text-xs font-mono transition"
                                title="Zoom In"
                            >
                                +
                            </button>
                        </div>

                        {/* Edit mode toggle */}
                        <button
                            onClick={() => setEditMode((p) => !p)}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-sm text-xs font-mono transition border ${
                                editMode
                                    ? 'bg-ink text-paper border-ink'
                                    : 'bg-paper text-ink-2 border-rule-2 hover:bg-paper-2'
                            }`}
                            title={editMode ? 'Exit Canvas Edit Mode' : 'Enter Canvas Edit Mode'}
                        >
                            <Edit2 className="w-3 h-3" />
                            <span>{editMode ? 'Done' : 'Edit'}</span>
                        </button>

                        {/* Reset layout */}
                        <button
                            onClick={handleResetToDefaultLayout}
                            className="p-1.5 border border-rule-2 rounded-sm bg-paper text-ink-3 hover:text-ink hover:bg-paper-2 transition"
                            title="Reset all node positions to default"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </header>

                {/* -----------------------------------------------------------
                    Flow Stepper Bar (Active when a flow is chosen)
                ----------------------------------------------------------- */}
                {activeFlow && (
                    <div className="bg-paper-3/90 border-b border-rule-2 px-4 py-2 z-20 flex flex-wrap items-center justify-between gap-3 text-xs font-mono shadow-sm">
                        <div className="flex items-center gap-3">
                            <span className="font-serif font-bold text-ink text-sm">
                                {activeFlow.label}
                            </span>
                            <span className="text-[11px] text-ink-3">
                                Step {currentStepIndex + 1} of {activeFlow.steps.length}:
                            </span>
                            <span className="font-semibold text-ink bg-paper px-2 py-0.5 rounded border border-rule">
                                {activeStep?.title}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Stepper buttons */}
                            <button
                                onClick={() =>
                                    setCurrentStepIndex((p) => (p > 0 ? p - 1 : activeFlow.steps.length - 1))
                                }
                                className="p-1 border border-rule-2 rounded bg-paper text-ink-2 hover:text-ink hover:bg-paper-2 transition"
                                title="Previous Step"
                            >
                                <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => setIsPlaying((p) => !p)}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded border text-xs font-mono transition ${
                                    isPlaying
                                        ? 'bg-ink text-paper border-ink'
                                        : 'bg-paper text-ink border-rule-2 hover:bg-paper-2'
                                }`}
                                title={isPlaying ? 'Pause Auto-Play' : 'Auto-Play Flow'}
                            >
                                {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                                <span>{isPlaying ? 'Pause' : 'Play'}</span>
                            </button>
                            <button
                                onClick={() =>
                                    setCurrentStepIndex((p) => (p < activeFlow.steps.length - 1 ? p + 1 : 0))
                                }
                                className="p-1 border border-rule-2 rounded bg-paper text-ink-2 hover:text-ink hover:bg-paper-2 transition"
                                title="Next Step"
                            >
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => handleFlowSelect(null)}
                                className="text-ink-3 hover:text-ink ml-2 px-1 text-[11px] underline"
                            >
                                Exit Flow
                            </button>
                        </div>
                    </div>
                )}

                {/* -----------------------------------------------------------
                    Edit Mode Toolbar (Active in Edit Mode)
                ----------------------------------------------------------- */}
                {editMode && (
                    <div className="bg-paper-2 border-b border-rule px-4 py-1.5 z-20 flex items-center justify-between text-xs font-mono text-ink-2">
                        <div className="flex items-center gap-2">
                            <span className="inline-block w-2 h-2 rounded-full bg-ink" />
                            <span>
                                <strong>Edit Mode Active:</strong> Drag nodes to rearrange • Click a node to edit label/sublabel • Connect node handles to create edges.
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleAddNode}
                                className="flex items-center gap-1 px-2.5 py-1 bg-paper border border-rule-2 rounded text-xs hover:bg-paper-3 transition"
                            >
                                <Plus className="w-3 h-3" />
                                <span>Add Node</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* -----------------------------------------------------------
                    React Flow Canvas
                ----------------------------------------------------------- */}
                <div className="flex-1 relative min-h-0 w-full h-full">
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onNodeClick={handleNodeClick}
                        onPaneClick={handlePaneClick}
                        onConnect={handleConnect}
                        nodeTypes={nodeTypes}
                        panOnScroll
                        panOnDrag
                        zoomOnScroll
                        minZoom={0.25}
                        maxZoom={2.0}
                        defaultViewport={{ x: 0, y: 0, zoom: 0.85 }}
                        className="w-full h-full"
                    >
                        <Background gap={20} size={1} color="#c6b79c" />
                        <Controls position="top-left" showInteractive={false} />
                    </ReactFlow>

                    {/* Floating Step Description Card */}
                    {activeFlow && activeStep && (
                        <div className="absolute top-4 left-16 z-20 bg-paper/95 backdrop-blur border border-rule-2 rounded-lg p-4 max-w-sm shadow-xl animate-in fade-in">
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className="w-2 h-2 rounded-full bg-ink" />
                                <span className="font-serif font-bold text-ink text-sm">
                                    {activeStep.title}
                                </span>
                            </div>
                            <p className="text-xs text-ink-2 font-sans leading-relaxed mb-2.5">
                                {activeStep.description}
                            </p>
                            <div className="flex items-center justify-between text-[10px] font-mono text-ink-3 pt-2 border-t border-rule">
                                <span>
                                    Step {currentStepIndex + 1} of {activeFlow.steps.length}
                                </span>
                                <span>Click canvas node to inspect details</span>
                            </div>
                        </div>
                    )}

                    {/* Quick Helper Floating Badge */}
                    {showInfoBanner && !activeFlow && !selectedNodeObj && (
                        <div className="absolute top-4 left-16 z-20 bg-paper/90 backdrop-blur border border-rule-2 rounded-lg p-3 max-w-xs shadow-md">
                            <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="font-serif font-bold text-xs text-ink flex items-center gap-1.5">
                                    <Info className="w-3.5 h-3.5" />
                                    <span>Interactive System Map</span>
                                </span>
                                <button
                                    onClick={() => setShowInfoBanner(false)}
                                    className="text-ink-3 hover:text-ink"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                            <p className="text-[11px] text-ink-3 font-sans leading-snug">
                                Select a flow from the dropdown above to walk through submission or auth lifecycle. Click any component to inspect its architecture, ports, and invariants.
                            </p>
                        </div>
                    )}

                    {/* -------------------------------------------------------
                        Component Inspector Slide-Over Panel
                    ------------------------------------------------------- */}
                    {selectedNodeObj && !editMode && (
                        <aside className="absolute top-0 right-0 bottom-0 w-80 md:w-96 bg-paper border-l border-rule-2 shadow-2xl z-30 flex flex-col overflow-y-auto animate-in slide-in-from-right duration-200">
                            {/* Panel Header */}
                            <div className="p-4 border-b border-rule bg-paper-2/60 flex items-start justify-between gap-2 sticky top-0 backdrop-blur z-10">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] font-mono uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-paper border border-rule-2 text-ink">
                                            {selectedNodeObj.data.typeLabel}
                                        </span>
                                        <span className="text-[10px] font-mono text-ink-3 border border-rule-2 rounded px-1.5 py-0.5 bg-paper/70">
                                            Port {selectedNodeObj.data.port}
                                        </span>
                                    </div>
                                    <h2 className="font-serif font-bold text-ink text-lg leading-tight">
                                        {selectedNodeObj.data.label}
                                    </h2>
                                </div>
                                <button
                                    onClick={() => setSelectedNodeId(null)}
                                    className="p-1 text-ink-3 hover:text-ink hover:bg-paper rounded transition"
                                    title="Close Panel"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Panel Body */}
                            <div className="p-4 space-y-4 text-xs font-sans text-ink">
                                {/* Description */}
                                <div>
                                    <h3 className="font-mono text-[10px] uppercase tracking-wider text-ink-3 mb-1 font-semibold">
                                        Overview & Purpose
                                    </h3>
                                    <p className="text-ink-2 leading-relaxed">
                                        {selectedNodeObj.data.description}
                                    </p>
                                </div>

                                {/* Tech Stack */}
                                <div>
                                    <h3 className="font-mono text-[10px] uppercase tracking-wider text-ink-3 mb-1 font-semibold">
                                        Technology Stack
                                    </h3>
                                    <div className="p-2 bg-paper-2 rounded border border-rule font-mono text-[11px] text-ink">
                                        {selectedNodeObj.data.tech}
                                    </div>
                                </div>

                                {/* Monorepo Location */}
                                <div>
                                    <h3 className="font-mono text-[10px] uppercase tracking-wider text-ink-3 mb-1 font-semibold">
                                        Monorepo Workspace
                                    </h3>
                                    <div className="flex items-center gap-1.5 p-2 bg-paper-3 rounded border border-rule-2 font-mono text-[11px] text-ink-2">
                                        <Server className="w-3.5 h-3.5 text-ink-3" />
                                        <span>{selectedNodeObj.data.path}</span>
                                    </div>
                                </div>

                                {/* Key Architectural Invariants */}
                                {selectedNodeObj.data.invariants && (
                                    <div>
                                        <h3 className="font-mono text-[10px] uppercase tracking-wider text-ink-3 mb-1 font-semibold">
                                            Architectural Invariants
                                        </h3>
                                        <ul className="space-y-1.5 list-none">
                                            {selectedNodeObj.data.invariants.map((inv, idx) => (
                                                <li
                                                    key={idx}
                                                    className="flex items-start gap-2 p-1.5 bg-paper-2/50 rounded border border-rule/70"
                                                >
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-ink-2 shrink-0 mt-0.5" />
                                                    <span className="text-[11px] text-ink-2 leading-snug">
                                                        {inv}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Connections overview */}
                                <div>
                                    <h3 className="font-mono text-[10px] uppercase tracking-wider text-ink-3 mb-1 font-semibold">
                                        Topology Connections
                                    </h3>
                                    <div className="space-y-2">
                                        {/* Inbound */}
                                        <div>
                                            <span className="text-[10px] font-mono text-ink-3">Inbound:</span>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {edges
                                                    .filter((e) => e.target === selectedNodeObj.id)
                                                    .map((e) => (
                                                        <span
                                                            key={e.id}
                                                            className="px-2 py-0.5 bg-paper-2 rounded border border-rule text-[10px] font-mono text-ink-2"
                                                        >
                                                            ← {e.source} ({e.label})
                                                        </span>
                                                    ))}
                                                {edges.filter((e) => e.target === selectedNodeObj.id).length === 0 && (
                                                    <span className="text-[10px] font-mono text-ink-3 italic">
                                                        No inbound edges
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Outbound */}
                                        <div>
                                            <span className="text-[10px] font-mono text-ink-3">Outbound:</span>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {edges
                                                    .filter((e) => e.source === selectedNodeObj.id)
                                                    .map((e) => (
                                                        <span
                                                            key={e.id}
                                                            className="px-2 py-0.5 bg-paper-2 rounded border border-rule text-[10px] font-mono text-ink-2"
                                                        >
                                                            → {e.target} ({e.label})
                                                        </span>
                                                    ))}
                                                {edges.filter((e) => e.source === selectedNodeObj.id).length === 0 && (
                                                    <span className="text-[10px] font-mono text-ink-3 italic">
                                                        No outbound edges
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </aside>
                    )}

                    {/* -------------------------------------------------------
                        Node Editor Modal (Edit Mode)
                    ------------------------------------------------------- */}
                    {editingNodeId && editMode && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <div
                                className="fixed inset-0 bg-ink/40 backdrop-blur-sm"
                                onClick={() => setEditingNodeId(null)}
                            />
                            <div className="bg-paper border border-rule-2 rounded-lg p-5 w-full max-w-md shadow-2xl z-50 animate-in zoom-in-95">
                                <div className="flex items-center justify-between mb-3 border-b border-rule pb-2">
                                    <h3 className="font-serif font-bold text-ink text-base">
                                        Edit Architecture Component
                                    </h3>
                                    <button
                                        onClick={() => setEditingNodeId(null)}
                                        className="p-1 text-ink-3 hover:text-ink rounded"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-[10px] font-mono uppercase text-ink-3 mb-1">
                                            Component Name / Label
                                        </label>
                                        <input
                                            type="text"
                                            value={editLabel}
                                            onChange={(e) => setEditLabel(e.target.value)}
                                            className="w-full bg-paper border border-rule-2 rounded-sm px-2.5 py-1.5 text-xs text-ink font-mono focus:outline-none focus:border-ink"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-mono uppercase text-ink-3 mb-1">
                                            Sublabel / Technology Description
                                        </label>
                                        <input
                                            type="text"
                                            value={editSublabel}
                                            onChange={(e) => setEditSublabel(e.target.value)}
                                            className="w-full bg-paper border border-rule-2 rounded-sm px-2.5 py-1.5 text-xs text-ink font-mono focus:outline-none focus:border-ink"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between pt-3 border-t border-rule mt-4">
                                        <button
                                            onClick={handleDeleteEditingNode}
                                            className="flex items-center gap-1 px-3 py-1.5 rounded-sm text-xs font-mono text-paper bg-red-700 hover:bg-red-800 transition"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            <span>Delete Node</span>
                                        </button>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setEditingNodeId(null)}
                                                className="px-3 py-1.5 rounded-sm text-xs font-mono text-ink-3 border border-rule-2 hover:bg-paper-2 transition"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleSaveNodeEdit}
                                                className="px-3 py-1.5 rounded-sm text-xs font-mono text-paper bg-ink border border-ink hover:bg-ink-2 transition"
                                            >
                                                Save Changes
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </FlowContext.Provider>
    );
}

// ---------------------------------------------------------------------------
// Exported Component Wrapped in ReactFlowProvider
// ---------------------------------------------------------------------------

export default function ArchitectureCanvas() {
    return (
        <ReactFlowProvider>
            <FlowCanvas />
        </ReactFlowProvider>
    );
}
