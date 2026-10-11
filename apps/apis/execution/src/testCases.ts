import fs from "fs/promises";
import { createReadStream, createWriteStream } from "fs";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";
import zlib from "zlib";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import yauzl from "yauzl";
import tar from "tar-stream";
import { TestCasesUnavailableError } from "@LCArena/execution";

export class TestCaseSourceError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "TestCaseSourceError";
    }
}

export interface AcquireTestCasesOptions {
    /**
     * `problem.testCasesUrl`. Either an `http(s)` URL to a `.zip`/`.tar[.gz]`
     * archive or a local path to an archive or a directory.
     */
    testCasesUrl: string;
    maxBytes?: number;
    maxEntries?: number;
}

export interface AcquiredTestCases {
    testCasesDir: string;
    cleanup: () => Promise<void>;
}

const DEFAULT_MAX_BYTES = 64 * 1024 * 1024;
const DEFAULT_MAX_ENTRIES = 10_000;
const DOWNLOAD_TIMEOUT_MS = 30_000;
const MAX_NESTING_DEPTH = 8;

interface ExtractionLimits {
    maxBytes: number;
    maxEntries: number;
}

const isHttpUrl = (value: string): boolean => /^https?:\/\//i.test(value);

/**
 * Resolves an archive entry name against the extraction root, rejecting
 * absolute paths and any `..` escape. This is the single choke point that both
 * the zip and tar readers rely on.
 */
export const resolveSafeEntryPath = (
    destinationDir: string,
    entryName: string
): string => {
    const normalized = entryName.replace(/\\/g, "/");

    if (normalized.length === 0 || normalized.includes("\0")) {
        throw new TestCaseSourceError("Rejected archive entry with an invalid name");
    }

    if (normalized.startsWith("/") || /^[a-zA-Z]:/.test(normalized)) {
        throw new TestCaseSourceError(
            `Rejected absolute archive entry: ${entryName}`
        );
    }

    const root = path.resolve(destinationDir);
    const target = path.resolve(root, normalized);

    if (target !== root && !target.startsWith(root + path.sep)) {
        throw new TestCaseSourceError(
            `Rejected archive entry escaping the destination: ${entryName}`
        );
    }

    return target;
};

const readHeader = async (filePath: string, length: number, position = 0) => {
    const buffer = Buffer.alloc(length);
    const handle = await fs.open(filePath, "r");

    try {
        const { bytesRead } = await handle.read(buffer, 0, length, position);
        return buffer.subarray(0, bytesRead);
    } finally {
        await handle.close();
    }
};

const extractZip = (
    archivePath: string,
    destinationDir: string,
    limits: ExtractionLimits
): Promise<void> =>
    new Promise((resolve, reject) => {
        yauzl.open(
            archivePath,
            { lazyEntries: true, autoClose: true, validateEntrySizes: true },
            (openError, zipFile) => {
                if (openError || !zipFile) {
                    reject(
                        new TestCaseSourceError(
                            `Failed to open zip archive: ${openError?.message ?? "unknown error"}`
                        )
                    );
                    return;
                }

                let entries = 0;
                let totalBytes = 0;
                let settled = false;

                const fail = (error: Error) => {
                    if (settled) return;
                    settled = true;
                    zipFile.close();
                    reject(error);
                };

                zipFile.on("error", (error: Error) => fail(error));

                zipFile.on("end", () => {
                    if (settled) return;
                    settled = true;
                    resolve();
                });

                zipFile.on("entry", (entry: yauzl.Entry) => {
                    void (async () => {
                        try {
                            if (/\/$/.test(entry.fileName)) {
                                zipFile.readEntry();
                                return;
                            }

                            if (++entries > limits.maxEntries) {
                                throw new TestCaseSourceError(
                                    "Test-case archive contains too many entries"
                                );
                            }

                            totalBytes += entry.uncompressedSize;

                            if (totalBytes > limits.maxBytes) {
                                throw new TestCaseSourceError(
                                    "Test-case archive expands beyond the size limit"
                                );
                            }

                            const target = resolveSafeEntryPath(
                                destinationDir,
                                entry.fileName
                            );

                            await fs.mkdir(path.dirname(target), {
                                recursive: true,
                            });

                            const readStream = await new Promise<Readable>(
                                (res, rej) =>
                                    zipFile.openReadStream(
                                        entry,
                                        (streamError, stream) =>
                                            streamError || !stream
                                                ? rej(
                                                      streamError ??
                                                          new Error(
                                                              "Missing zip entry stream"
                                                          )
                                                  )
                                                : res(stream)
                                    )
                            );

                            await pipeline(
                                readStream,
                                createWriteStream(target, { mode: 0o600 })
                            );

                            zipFile.readEntry();
                        } catch (error) {
                            fail(
                                error instanceof Error
                                    ? error
                                    : new Error("Failed to extract zip entry")
                            );
                        }
                    })();
                });

                zipFile.readEntry();
            }
        );
    });

const extractTar = async (
    archivePath: string,
    destinationDir: string,
    limits: ExtractionLimits,
    gzipped: boolean
): Promise<void> => {
    const extractor = tar.extract();
    let entries = 0;
    let totalBytes = 0;

    extractor.on("entry", (header, stream, next) => {
        const consume = async () => {
            if (header.type !== "file") {
                // Directories and all special entries (symlinks, devices, ...)
                // are skipped rather than materialized.
                stream.resume();
                next();
                return;
            }

            if (++entries > limits.maxEntries) {
                throw new TestCaseSourceError(
                    "Test-case archive contains too many entries"
                );
            }

            totalBytes += header.size;

            if (totalBytes > limits.maxBytes) {
                throw new TestCaseSourceError(
                    "Test-case archive expands beyond the size limit"
                );
            }

            const target = resolveSafeEntryPath(destinationDir, header.name);

            await fs.mkdir(path.dirname(target), { recursive: true });
            await pipeline(stream, createWriteStream(target, { mode: 0o600 }));
            next();
        };

        consume().catch((error) => {
            extractor.destroy(
                error instanceof Error
                    ? error
                    : new Error("Failed to extract tar entry")
            );
        });
    });

    const source = createReadStream(archivePath);

    if (gzipped) {
        await pipeline(source, zlib.createGunzip(), extractor);
    } else {
        await pipeline(source, extractor);
    }
};

const looksLikeTar = async (archivePath: string): Promise<boolean> => {
    const header = await readHeader(archivePath, 512);

    if (header.length < 262) {
        return false;
    }

    return header.subarray(257, 262).toString("ascii") === "ustar";
};

const extractArchive = async (
    archivePath: string,
    destinationDir: string,
    limits: ExtractionLimits
): Promise<void> => {
    const magic = await readHeader(archivePath, 4);

    const isZip =
        magic.length >= 4 &&
        magic[0] === 0x50 &&
        magic[1] === 0x4b &&
        (magic[2] === 0x03 || magic[2] === 0x05 || magic[2] === 0x07);
    const isGzip = magic.length >= 2 && magic[0] === 0x1f && magic[1] === 0x8b;

    try {
        if (isZip) {
            return await extractZip(archivePath, destinationDir, limits);
        }

        if (isGzip) {
            return await extractTar(archivePath, destinationDir, limits, true);
        }

        if (await looksLikeTar(archivePath)) {
            return await extractTar(archivePath, destinationDir, limits, false);
        }
    } catch (error) {
        if (error instanceof TestCaseSourceError) {
            throw error;
        }

        // Normalise reader-specific errors (yauzl/tar-stream) so callers can
        // treat every archive problem uniformly.
        throw new TestCaseSourceError(
            `Failed to extract test-case archive: ${
                error instanceof Error ? error.message : "unknown error"
            }`
        );
    }

    throw new TestCaseSourceError(
        `Unsupported test-case archive format: ${path.basename(archivePath)}`
    );
};

const downloadToFile = async (
    url: string,
    maxBytes: number
): Promise<string> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            redirect: "follow",
        });

        if (!response.ok || !response.body) {
            throw new TestCaseSourceError(
                `Failed to download test cases (HTTP ${response.status})`
            );
        }

        const declaredLength = Number(
            response.headers.get("content-length") ?? 0
        );

        if (declaredLength > maxBytes) {
            throw new TestCaseSourceError(
                "Test-case archive exceeds the configured size limit"
            );
        }

        const target = path.join(
            os.tmpdir(),
            `lcarena-testcases-${randomUUID()}`
        );

        let received = 0;
        const body = Readable.fromWeb(response.body);

        body.on("data", (chunk: Buffer) => {
            received += chunk.length;

            if (received > maxBytes) {
                body.destroy(
                    new TestCaseSourceError(
                        "Test-case archive exceeds the configured size limit"
                    )
                );
            }
        });

        await pipeline(body, createWriteStream(target, { mode: 0o600 }));

        return target;
    } finally {
        clearTimeout(timeout);
    }
};

const copyDirectory = async (
    sourceDir: string,
    destinationDir: string,
    maxEntries: number
): Promise<void> => {
    let copied = 0;

    const walk = async (dir: string): Promise<void> => {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
            if (entry.isSymbolicLink()) {
                continue;
            }

            const from = path.join(dir, entry.name);
            const to = path.join(
                destinationDir,
                path.relative(sourceDir, from)
            );

            if (entry.isDirectory()) {
                await fs.mkdir(to, { recursive: true });
                await walk(from);
            } else if (entry.isFile()) {
                if (++copied > maxEntries) {
                    throw new TestCaseSourceError(
                        "Test-case source contains too many files"
                    );
                }

                await fs.mkdir(path.dirname(to), { recursive: true });
                await fs.copyFile(from, to);
            }
        }
    };

    await walk(sourceDir);
};

const isTestCaseDir = async (dir: string): Promise<boolean> => {
    const files = await fs.readdir(dir).catch(() => [] as string[]);

    return (
        files.some((file) => file.endsWith(".in")) &&
        files.some((file) => file.endsWith(".ans"))
    );
};

/**
 * The runner iterates `./testcases/*` and expects each child to be a folder
 * holding a `*.in` and a `*.ans`. Archives that wrap everything in one extra
 * top-level directory are descended into; archives without any usable case are
 * rejected so an empty run is never reported as SUCCESS.
 */
const resolveTestCasesRoot = async (
    workspaceDir: string
): Promise<string> => {
    let current = workspaceDir;

    for (let depth = 0; depth < MAX_NESTING_DEPTH; depth++) {
        const entries = await fs.readdir(current, { withFileTypes: true });
        const directories = entries.filter((entry) => entry.isDirectory());

        for (const directory of directories) {
            if (await isTestCaseDir(path.join(current, directory.name))) {
                return current;
            }
        }

        if (directories.length === 1) {
            current = path.join(current, directories[0].name);
            continue;
        }

        break;
    }

    throw new TestCasesUnavailableError(
        "No usable test cases (each case needs a .in and a .ans file) were found"
    );
};

/**
 * Stages a problem's test cases into a fresh, private workspace and returns the
 * directory the executor should read from. On any failure the workspace is
 * removed before the error propagates.
 */
export const acquireTestCases = async (
    options: AcquireTestCasesOptions
): Promise<AcquiredTestCases> => {
    const limits: ExtractionLimits = {
        maxBytes: options.maxBytes ?? DEFAULT_MAX_BYTES,
        maxEntries: options.maxEntries ?? DEFAULT_MAX_ENTRIES,
    };

    const workspaceDir = await fs.mkdtemp(
        path.join(os.tmpdir(), "lcarena-testcases-")
    );

    const cleanup = async (): Promise<void> => {
        await fs
            .rm(workspaceDir, { recursive: true, force: true })
            .catch(() => undefined);
    };

    try {
        if (isHttpUrl(options.testCasesUrl)) {
            const downloaded = await downloadToFile(
                options.testCasesUrl,
                limits.maxBytes
            );

            try {
                await extractArchive(downloaded, workspaceDir, limits);
            } finally {
                await fs.rm(downloaded, { force: true }).catch(() => undefined);
            }
        } else {
            let sourcePath = path.resolve(options.testCasesUrl);
            let stat = await fs.stat(sourcePath).catch(() => null);

            if (!stat) {
                const isLegacyPlaceholder =
                    options.testCasesUrl === "that" ||
                    options.testCasesUrl === "this";
                const isBundledReference =
                    isLegacyPlaceholder ||
                    options.testCasesUrl === "testcases" ||
                    options.testCasesUrl.includes("packages/backend/execution/testcases");

                const candidates: string[] = [];
                if (!path.isAbsolute(options.testCasesUrl)) {
                    candidates.push(
                        path.resolve(process.cwd(), options.testCasesUrl),
                        path.resolve(__dirname, "../../../..", options.testCasesUrl),
                        path.resolve(__dirname, "../../..", options.testCasesUrl)
                    );
                }
                if (isBundledReference) {
                    candidates.push(
                        path.resolve(process.cwd(), "packages/backend/execution/testcases"),
                        path.resolve(process.cwd(), "testcases"),
                        path.resolve(__dirname, "../../../../packages/backend/execution/testcases"),
                        path.resolve(__dirname, "../../../packages/backend/execution/testcases")
                    );
                }

                for (const candidate of candidates) {
                    const candidateStat = await fs.stat(candidate).catch(() => null);
                    if (candidateStat) {
                        sourcePath = candidate;
                        stat = candidateStat;
                        break;
                    }
                }
            }

            if (!stat) {
                throw new TestCaseSourceError(
                    `Test-case source was not found: ${options.testCasesUrl}`
                );
            }

            if (stat.isDirectory()) {
                await copyDirectory(
                    sourcePath,
                    workspaceDir,
                    limits.maxEntries
                );
            } else {
                await extractArchive(sourcePath, workspaceDir, limits);
            }
        }

        const testCasesDir = await resolveTestCasesRoot(workspaceDir);

        return { testCasesDir, cleanup };
    } catch (error) {
        await cleanup();
        throw error;
    }
};
