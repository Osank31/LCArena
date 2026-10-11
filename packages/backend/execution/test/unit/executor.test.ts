/**
 * Unit tests for the shared `Executor` base class.
 *
 * Everything here runs against fake Docker objects: no daemon, no containers.
 * The runner-script contract and the test-case packaging are the two places
 * where a regression silently produces wrong verdicts, so they are asserted
 * directly rather than through mocked call counts.
 *
 * Run with: npm run test:unit
 */
import { after, describe, it } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises"
import tar from "tar-stream"
import Docker from "dockerode"
import { Executor, TestCasesUnavailableError } from "../../src/executor/index.js"
import { type ExecutionResult } from "../../src/executor/executionResult.type.js"

/** Exposes the protected surface so the base class can be tested directly. */
class ProbeExecutor extends Executor {
    public runnerScript(
        timeLimitSeconds: number,
        testcasesDir: string,
        compileCmd: string,
        runCmd: string
    ) {
        return this.generateRunnerScript(
            timeLimitSeconds,
            testcasesDir,
            compileCmd,
            runCmd
        )
    }

    public copy(container: Docker.Container) {
        return this.copyTestCasesToContainer(container)
    }

    public run(container: Docker.Container, cmd: string) {
        return this.runCommand(container, cmd)
    }

    public pull(image: string) {
        return this.pullImage(image)
    }

    public get dir() {
        return this.testCasesDir
    }

    async execute(): Promise<ExecutionResult> {
        throw new Error("not used by these tests")
    }
}

const tempDirs: string[] = []

const makeTempDir = async (files: Record<string, string>) => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "lcarena-exec-test-"))
    tempDirs.push(dir)

    for (const [relative, content] of Object.entries(files)) {
        const target = path.join(dir, relative)
        await fs.mkdir(path.dirname(target), { recursive: true })
        await fs.writeFile(target, content)
    }

    return dir
}

after(async () => {
    await Promise.all(
        tempDirs.map((dir) => fs.rm(dir, { recursive: true, force: true }))
    )
})

describe("Executor test-case directory", () => {
    it("defaults to <cwd>/testcases", () => {
        assert.equal(
            new ProbeExecutor().dir,
            path.join(process.cwd(), "testcases")
        )
    })

    it("honours an isolated per-submission directory", () => {
        assert.equal(
            new ProbeExecutor("/tmp/isolated-cases").dir,
            "/tmp/isolated-cases"
        )
    })
})

describe("Executor#generateRunnerScript", () => {
    const script = new ProbeExecutor().runnerScript(
        5,
        "testcases",
        "g++ -O3 -std=c++17 Main.cpp -o ./solution",
        "./solution"
    )

    it("enforces the per-test timeout with the seconds budget it was given", () => {
        assert.match(script, /TIME_LIMIT="5s"/)
        assert.match(script, /timeout "\$TIME_LIMIT" \.\/solution/)
    })

    it("reports a compile error as a structured COMPILE_ERROR verdict", () => {
        assert.match(script, /if ! g\+\+ -O3 -std=c\+\+17 Main\.cpp -o \.\/solution/)
        assert.match(script, /COMPILE_ERROR/)
    })

    it("classifies timeouts, crashes and mismatches", () => {
        // 124 is `timeout`'s exit code for "killed after the limit".
        assert.match(script, /if \[ \$EXIT_CODE -eq 124 \]/)
        assert.match(script, /TLE_CASES\+=/)
        assert.match(script, /elif \[ \$EXIT_CODE -ne 0 \]/)
        assert.match(script, /RE_CASES\+=/)
        assert.match(script, /diff -b -B "\$ans_file" "\$user_out"/)
        assert.match(script, /WA_CASES\+=/)
    })

    it("emits the documented SUCCESS JSON summary", () => {
        assert.match(script, /"status": "SUCCESS"/)
        assert.match(script, /"passed": \$PASSED_CASES/)
        assert.match(script, /"total": \$TOTAL_CASES/)
        assert.match(script, /"executionTimeMs"/)
        assert.match(script, /"tle": \[/)
        assert.match(script, /"re": \[/)
        assert.match(script, /"wa": \[/)
    })

    it("only walks test-case directories that contain an input and an answer", () => {
        assert.match(script, /for tc_dir in "\$TESTCASES_DIR"\/\*/)
        assert.match(script, /\[ -d "\$tc_dir" \] \|\| continue/)
        assert.match(script, /-name "\*\.in"/)
        assert.match(script, /-name "\*\.ans"/)
    })
})

describe("Executor#copyTestCasesToContainer", () => {
    it("packs every file under testcases/ preserving the relative path", async () => {
        const dir = await makeTempDir({
            "test_case_id001/icpc-barrier_1_1.in": "1 2",
            "test_case_id001/icpc-barrier_1_1.ans": "3",
            "test_case_id002/nested/deep.in": "4",
            "test_case_id002/nested/deep.ans": "5",
        })

        const entries: Record<string, string> = {}
        let destination: { path?: string } | undefined

        const container = {
            putArchive: async (pack: NodeJS.ReadableStream, options: { path?: string }) => {
                destination = options
                const extract = tar.extract()

                extract.on("entry", (header, stream, next) => {
                    let body = ""
                    stream.on("data", (chunk) => {
                        body += chunk.toString()
                    })
                    stream.on("end", () => {
                        entries[header.name] = body
                        next()
                    })
                })

                await pipeline(pack, extract)
            },
        } as unknown as Docker.Container

        await new ProbeExecutor(dir).copy(container)

        assert.deepEqual(destination, { path: "/workspace" })
        assert.deepEqual(entries, {
            "testcases/test_case_id001/icpc-barrier_1_1.in": "1 2",
            "testcases/test_case_id001/icpc-barrier_1_1.ans": "3",
            "testcases/test_case_id002/nested/deep.in": "4",
            "testcases/test_case_id002/nested/deep.ans": "5",
        })
    })

    it("fails loudly when the directory cannot be read", async () => {
        const container = { putArchive: async () => {} } as unknown as Docker.Container

        await assert.rejects(
            () => new ProbeExecutor(path.join(os.tmpdir(), "does-not-exist-lcarena")).copy(container),
            (error: unknown) => error instanceof TestCasesUnavailableError
        )
    })

    it("treats an empty test-case directory as an infrastructure failure", async () => {
        const dir = await makeTempDir({})
        const container = { putArchive: async () => {} } as unknown as Docker.Container

        await assert.rejects(
            () => new ProbeExecutor(dir).copy(container),
            (error: unknown) =>
                error instanceof TestCasesUnavailableError &&
                /No test cases found/.test((error as Error).message)
        )
    })
})

describe("Executor#runCommand", () => {
    it("runs the command through bash -c and merges stdout and stderr", async () => {
        const seen: { Cmd?: string[] }[] = []

        const container = {
            exec: async (options: { Cmd?: string[] }) => {
                seen.push(options)
                return { start: async () => Readable.from(["hello ", "world"]) }
            },
            modem: {
                demuxStream: (stream: NodeJS.ReadableStream, out: NodeJS.WritableStream) => {
                    stream.on("data", (chunk: Buffer) => out.write(chunk))
                },
            },
        } as unknown as Docker.Container

        const output = await new ProbeExecutor().run(container, "echo hi")

        assert.equal(output, "hello world")
        assert.deepEqual(seen[0].Cmd, ["/bin/bash", "-c", "echo hi"])
    })
})

describe("Executor#pullImage", () => {
    const originalDocker = (Executor as unknown as { docker: unknown }).docker

    after(() => {
        ;(Executor as unknown as { docker: unknown }).docker = originalDocker
    })

    const useDocker = (docker: unknown) => {
        ;(Executor as unknown as { docker: unknown }).docker = docker
    }

    it("does not pull an image that is already present", async () => {
        let pulled = 0

        useDocker({
            getImage: () => ({ inspect: async () => ({}) }),
            pull: () => {
                pulled += 1
            },
        })

        await new ProbeExecutor().pull("gcc:latest")

        assert.equal(pulled, 0)
    })

    it("pulls the image when inspect returns 404", async () => {
        let pulledWith: string | undefined

        useDocker({
            getImage: () => ({
                inspect: async () => {
                    throw Object.assign(new Error("no such image"), { statusCode: 404 })
                },
            }),
            pull: (image: string, callback: (err: Error | null, stream: unknown) => void) => {
                pulledWith = image
                callback(null, Readable.from([]))
            },
            modem: {
                followProgress: (
                    _stream: unknown,
                    onFinished: (err: Error | null, output: unknown[]) => void
                ) => onFinished(null, []),
            },
        })

        await new ProbeExecutor().pull("python:3.11-slim")

        assert.equal(pulledWith, "python:3.11-slim")
    })

    it("propagates daemon errors that are not a missing image", async () => {
        useDocker({
            getImage: () => ({
                inspect: async () => {
                    throw Object.assign(new Error("docker socket permission denied"), {
                        statusCode: 403,
                    })
                },
            }),
        })

        await assert.rejects(
            () => new ProbeExecutor().pull("gcc:latest"),
            /permission denied/
        )
    })

    it("surfaces pull failures", async () => {
        useDocker({
            getImage: () => ({
                inspect: async () => {
                    throw Object.assign(new Error("no such image"), { statusCode: 404 })
                },
            }),
            pull: (_image: string, callback: (err: Error | null, stream: unknown) => void) =>
                callback(new Error("registry unreachable"), Readable.from([])),
        })

        await assert.rejects(
            () => new ProbeExecutor().pull("java:latest"),
            /registry unreachable/
        )
    })
})
