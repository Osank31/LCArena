/**
 * Environment configuration helper for Load Tests
 */
export const getEnv = () => {
    // Check if running inside k6 or standard Node
    const envObj = typeof __ENV !== 'undefined' ? __ENV : process.env;

    // Detect if inside docker network
    const isDockerNetwork = Boolean(envObj.IN_DOCKER_NETWORK || envObj.K6_IN_DOCKER);

    const defaultGateway = isDockerNetwork ? 'http://gateway:3000' : 'http://127.0.0.1:3000';
    const defaultProblem = isDockerNetwork ? 'http://problem:3001' : 'http://127.0.0.1:3001';
    const defaultSubmission = isDockerNetwork ? 'http://submission:3002' : 'http://127.0.0.1:3002';
    const defaultMail = isDockerNetwork ? 'http://mail:3003' : 'http://127.0.0.1:3003';
    const defaultExecution = isDockerNetwork ? 'http://execution:3004' : 'http://127.0.0.1:3004';
    const defaultAi = isDockerNetwork ? 'http://ai-suggestion:8000' : 'http://127.0.0.1:8000';

    return {
        GATEWAY_URL: envObj.GATEWAY_URL || defaultGateway,
        PROBLEM_SERVICE_URL: envObj.PROBLEM_SERVICE_URL || defaultProblem,
        SUBMISSION_SERVICE_URL: envObj.SUBMISSION_SERVICE_URL || defaultSubmission,
        MAIL_SERVICE_URL: envObj.MAIL_SERVICE_URL || defaultMail,
        EXECUTION_SERVICE_URL: envObj.EXECUTION_SERVICE_URL || defaultExecution,
        AI_SERVICE_URL: envObj.AI_SERVICE_URL || defaultAi,

        ADMIN_EMAIL: envObj.TEST_ADMIN_EMAIL || 'admin@lcarena.test',
        ADMIN_PASSWORD: envObj.TEST_ADMIN_PASSWORD || 'Password123',
        USER_EMAIL: envObj.TEST_USER_EMAIL || 'regular@lcarena.test',
        USER_PASSWORD: envObj.TEST_USER_PASSWORD || 'Password123',

        TARGET_PROBLEM_ID: envObj.TARGET_PROBLEM_ID || '6acbe44e0037ad06dc5f0c20',
        TARGET_USER_ID: envObj.TARGET_USER_ID || '6acb3db878de73ea0b742ffc',

        MONGODB_URL: envObj.MONGODB_URL || 'mongodb://127.0.0.1:27017/lcarena',
        REDIS_HOST: envObj.REDIS_HOST || '127.0.0.1',
        REDIS_PORT: parseInt(envObj.REDIS_PORT || '6379', 10),
        RABBITMQ_URL: envObj.RABBITMQ_URL || 'amqp://guest:guest@127.0.0.1:5672',

        MAX_VUS: parseInt(envObj.MAX_VUS || '200', 10),
        DURATION: envObj.DURATION || '20s',
    };
};
