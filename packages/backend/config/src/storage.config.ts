import {
    S3Client,
    HeadBucketCommand,
    CreateBucketCommand,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    DeleteObjectsCommand,
    ListObjectsV2Command,
    type ListObjectsV2CommandOutput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "stream";
import { logger } from "@LCArena/utils";

export interface StorageConfig {
    endpoint?: string;
    region: string;
    credentials: {
        accessKeyId: string;
        secretAccessKey: string;
    };
    forcePathStyle: boolean;
    bucketName: string;
}

export const getStorageConfig = (): StorageConfig => {
    const endpoint = process.env.S3_ENDPOINT || undefined;
    const region = process.env.S3_REGION || "us-east-1";
    const accessKeyId =
        process.env.S3_ACCESS_KEY_ID ||
        process.env.AWS_ACCESS_KEY_ID ||
        process.env.AWS_ACCESS_KEY ||
        "minioadmin";
    const secretAccessKey =
        process.env.S3_SECRET_ACCESS_KEY ||
        process.env.AWS_SECRET_ACCESS_KEY ||
        "minioadmin";
    const bucketName = process.env.S3_BUCKET_NAME || "lcarena-testcases";

    // When an endpoint is specified (like local MinIO or custom S3-compatible service),
    // default to path style unless explicitly set to "false".
    const forcePathStyle =
        process.env.S3_FORCE_PATH_STYLE !== undefined
            ? process.env.S3_FORCE_PATH_STYLE === "true"
            : Boolean(endpoint);

    return {
        endpoint,
        region,
        credentials: {
            accessKeyId,
            secretAccessKey,
        },
        forcePathStyle,
        bucketName,
    };
};

let cachedClient: S3Client | null = null;

export const getS3Client = (): S3Client => {
    if (!cachedClient) {
        const config = getStorageConfig();
        cachedClient = new S3Client({
            endpoint: config.endpoint,
            region: config.region,
            credentials: config.credentials,
            forcePathStyle: config.forcePathStyle,
        });
    }
    return cachedClient;
};

/** Reset cached client (useful in tests when env variables change). */
export const resetS3Client = (): void => {
    cachedClient = null;
};

export const getBucketName = (): string => getStorageConfig().bucketName;

/**
 * Idempotently ensures the target bucket exists.
 */
export const ensureBucketExists = async (
    targetBucket?: string
): Promise<void> => {
    const s3 = getS3Client();
    const bucket = targetBucket || getBucketName();

    try {
        await s3.send(new HeadBucketCommand({ Bucket: bucket }));
    } catch (error: any) {
        const status = error?.$metadata?.httpStatusCode;
        const code = error?.name;

        if (status === 404 || code === "NotFound" || code === "NoSuchBucket") {
            try {
                await s3.send(new CreateBucketCommand({ Bucket: bucket }));
                logger.info(`Object storage bucket created: ${bucket}`);
            } catch (createErr: any) {
                // Ignore if created concurrently by another worker
                if (
                    createErr?.name === "BucketAlreadyOwnedByYou" ||
                    createErr?.name === "BucketAlreadyExists"
                ) {
                    return;
                }
                logger.error(`Failed to create bucket ${bucket}:`, createErr);
                throw createErr;
            }
        } else {
            logger.warn(`HeadBucket check returned error for ${bucket}:`, error);
            throw error;
        }
    }
};

/**
 * Exact logical key structure helpers according to LCArena specification:
 * Evaluation_Test_Cases/Test_Cases_<PROBLEM_ID>/test_case_001/input.in
 * Evaluation_Test_Cases/Test_Cases_<PROBLEM_ID>/test_case_001/output.ans
 */
export const formatTestCaseFolderName = (index: number): string =>
    `test_case_${String(index).padStart(3, "0")}`;

export const getProblemTestCasePrefix = (problemId: string): string =>
    `Evaluation_Test_Cases/Test_Cases_${problemId}/`;

export const getTestCaseInputKey = (
    problemId: string,
    index: number
): string =>
    `${getProblemTestCasePrefix(problemId)}${formatTestCaseFolderName(index)}/input.in`;

export const getTestCaseOutputKey = (
    problemId: string,
    index: number
): string =>
    `${getProblemTestCasePrefix(problemId)}${formatTestCaseFolderName(index)}/output.ans`;

export const putObject = async (
    key: string,
    body: Buffer | string,
    contentType = "text/plain; charset=utf-8",
    targetBucket?: string
): Promise<void> => {
    const s3 = getS3Client();
    const bucket = targetBucket || getBucketName();

    await s3.send(
        new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: typeof body === "string" ? Buffer.from(body, "utf-8") : body,
            ContentType: contentType,
        })
    );
};

export const getObject = async (
    key: string,
    targetBucket?: string
): Promise<Buffer> => {
    const s3 = getS3Client();
    const bucket = targetBucket || getBucketName();

    const response = await s3.send(
        new GetObjectCommand({
            Bucket: bucket,
            Key: key,
        })
    );

    if (!response.Body) {
        throw new Error(`Empty body returned for S3 object: ${key}`);
    }

    if (Buffer.isBuffer(response.Body)) {
        return response.Body;
    }

    if (response.Body instanceof Uint8Array) {
        return Buffer.from(response.Body);
    }

    const stream = response.Body as Readable;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
        chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks);
};

export const listObjects = async (
    prefix: string,
    targetBucket?: string
): Promise<string[]> => {
    const s3 = getS3Client();
    const bucket = targetBucket || getBucketName();

    const keys: string[] = [];
    let continuationToken: string | undefined = undefined;

    do {
        const response: ListObjectsV2CommandOutput = await s3.send(
            new ListObjectsV2Command({
                Bucket: bucket,
                Prefix: prefix,
                ContinuationToken: continuationToken,
            })
        );

        if (response.Contents) {
            for (const item of response.Contents) {
                if (item.Key) {
                    keys.push(item.Key);
                }
            }
        }

        continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return keys;
};

export const deleteObject = async (
    key: string,
    targetBucket?: string
): Promise<void> => {
    const s3 = getS3Client();
    const bucket = targetBucket || getBucketName();

    await s3.send(
        new DeleteObjectCommand({
            Bucket: bucket,
            Key: key,
        })
    );
};

export const deleteObjectsWithPrefix = async (
    prefix: string,
    targetBucket?: string
): Promise<number> => {
    const s3 = getS3Client();
    const bucket = targetBucket || getBucketName();

    const keys = await listObjects(prefix, bucket);
    if (keys.length === 0) {
        return 0;
    }

    // DeleteObjects handles up to 1000 keys per batch
    const batchSize = 1000;
    for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);
        await s3.send(
            new DeleteObjectsCommand({
                Bucket: bucket,
                Delete: {
                    Objects: batch.map((k) => ({ Key: k })),
                    Quiet: true,
                },
            })
        );
    }

    return keys.length;
};

export const getPresignedDownloadUrl = async (
    key: string,
    expiresInSeconds = 900,
    targetBucket?: string
): Promise<string> => {
    const s3 = getS3Client();
    const bucket = targetBucket || getBucketName();

    const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
    });

    return await getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
};
