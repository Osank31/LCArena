import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcrypt';
import { getEnv } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONTEXT_FILE = path.join(__dirname, 'test-context.json');

export async function seedLoadFixtures() {
    const env = getEnv();
    console.log('[seed] Initializing load-test fixtures...');

    const client = new MongoClient(env.MONGODB_URL, { serverSelectionTimeoutMS: 5000 });
    await client.connect();
    const db = client.db();

    // 1. Ensure test users exist
    const usersCol = db.collection('users');
    const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 10);

    let admin = await usersCol.findOne({ email: env.ADMIN_EMAIL });
    if (!admin) {
        const res = await usersCol.insertOne({
            _id: new ObjectId('6acb3db878de73ea0b742ffb'),
            name: 'Admin User',
            email: env.ADMIN_EMAIL,
            password: passwordHash,
            profilePicUrl: '/default-url',
            userType: 'Admin',
            roleExpiry: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        admin = await usersCol.findOne({ _id: res.insertedId });
    }

    let regular = await usersCol.findOne({ email: env.USER_EMAIL });
    if (!regular) {
        const res = await usersCol.insertOne({
            _id: new ObjectId('6acb3db878de73ea0b742ffc'),
            name: 'Regular User',
            email: env.USER_EMAIL,
            password: passwordHash,
            profilePicUrl: '/default-url',
            userType: 'Regular',
            roleExpiry: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        regular = await usersCol.findOne({ _id: res.insertedId });
    }

    // 2. Ensure at least one Problem exists
    const problemsCol = db.collection('problems');
    let problem = await problemsCol.findOne({ _id: new ObjectId(env.TARGET_PROBLEM_ID) });
    if (!problem) {
        problem = await problemsCol.findOne({});
    }

    if (!problem) {
        const newProblem = await problemsCol.insertOne({
            description: 'Load test benchmark problem: Compute coordinates intersection',
            difficulty: 'Easy',
            sampleTestCaseUrl: 'https://seed.lcarena.local/sample.txt',
            testCasesUrl: 'https://seed.lcarena.local/testcases.zip',
            time_limit: 2000,
            testCasesCount: 5,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        problem = await problemsCol.findOne({ _id: newProblem.insertedId });
    }

    await client.close();

    // 3. Acquire initial tokens via Gateway login
    console.log(`[seed] Logging into Gateway at ${env.GATEWAY_URL}...`);
    let adminToken = '';
    let regularToken = '';
    let regularRefreshToken = '';

    try {
        const adminLogin = await fetch(`${env.GATEWAY_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD }),
        });
        const adminData = await adminLogin.json();
        if (adminData.data?.accessToken) {
            adminToken = adminData.data.accessToken;
        }

        const regLogin = await fetch(`${env.GATEWAY_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: env.USER_EMAIL, password: env.USER_PASSWORD }),
        });
        const regData = await regLogin.json();
        if (regData.data?.accessToken) {
            regularToken = regData.data.accessToken;
        }

        const setCookies = regLogin.headers.getSetCookie?.() || [];
        const refreshCookie = setCookies.find((c) => c.startsWith('refreshToken='));
        if (refreshCookie) {
            regularRefreshToken = refreshCookie.split(';')[0].replace('refreshToken=', '');
        }
    } catch (err) {
        console.warn(`[seed] Could not pre-fetch tokens via Gateway: ${err.message}. Proceeding with placeholders.`);
    }

    const context = {
        adminUser: {
            id: String(admin._id),
            email: admin.email,
            password: env.ADMIN_PASSWORD,
            token: adminToken,
        },
        regularUser: {
            id: String(regular._id),
            email: regular.email,
            password: env.USER_PASSWORD,
            token: regularToken,
            refreshToken: regularRefreshToken,
        },
        problem: {
            id: String(problem._id),
            difficulty: problem.difficulty,
            timeLimit: problem.time_limit || 2000,
        },
        timestamp: new Date().toISOString(),
    };

    fs.writeFileSync(CONTEXT_FILE, JSON.stringify(context, null, 2), 'utf-8');
    console.log(`[seed] Saved test context to ${CONTEXT_FILE}`);
    return context;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    seedLoadFixtures().catch(console.error);
}
