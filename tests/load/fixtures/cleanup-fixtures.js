import { MongoClient, ObjectId } from 'mongodb';
import { getEnv } from '../config/env.js';

export async function cleanupLoadFixtures() {
    const env = getEnv();
    console.log('[cleanup] Starting cleanup of load test transient data...');

    const client = new MongoClient(env.MONGODB_URL, { serverSelectionTimeoutMS: 5000 });
    try {
        await client.connect();
        const db = client.db();

        // 1. Delete submissions generated during load testing
        const submissionsCol = db.collection('submissions');
        const deletedSubmissions = await submissionsCol.deleteMany({
            $or: [
                { 'code': { $regex: /loadtest|LoadTest|bench/i } },
                { 'userId': new ObjectId('6acb3db878de73ea0b742ffc'), createdAt: { $gte: new Date(Date.now() - 3600 * 1000) } }
            ]
        });
        console.log(`[cleanup] Removed ${deletedSubmissions.deletedCount} transient load-test submissions.`);

        // 2. Delete any transient test users created during registration tests
        const usersCol = db.collection('users');
        const deletedUsers = await usersCol.deleteMany({
            email: { $regex: /^loadtest-.*@lcarena\.test$/i }
        });
        console.log(`[cleanup] Removed ${deletedUsers.deletedCount} transient test user accounts.`);

        // 3. Delete any transient problems created during admin mutation tests
        const problemsCol = db.collection('problems');
        const deletedProblems = await problemsCol.deleteMany({
            description: { $regex: /Load Test Mutation Problem/i }
        });
        console.log(`[cleanup] Removed ${deletedProblems.deletedCount} transient test problems.`);

    } catch (err) {
        console.error('[cleanup] Cleanup encountered error:', err.message);
    } finally {
        await client.close();
        console.log('[cleanup] Cleanup finished.');
    }
}

if (process.argv[1].endsWith('cleanup-fixtures.js')) {
    cleanupLoadFixtures().catch(console.error);
}
