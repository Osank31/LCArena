/**
 * LCArena Output Comparison Policy & Utilities
 *
 * Judging Policy Specification:
 * 1. Line endings: CRLF (\r\n) and CR (\r) are normalized to LF (\n).
 * 2. Trailing line whitespace: Spaces/tabs at the end of each line are ignored.
 * 3. Trailing file whitespace: Trailing blank lines or whitespace at the end of the file are ignored.
 * 4. Internal whitespace: By default, token-level spacing within lines is preserved (unless ignoreSpaceChange is true).
 * 5. Blank lines: Preserved by default, but optional ignoreBlankLines allows matching with empty line variations.
 * 6. Meaningful content: Genuine differences in values, casing, tokens, or non-trailing layout are flagged as mismatches (Wrong Answer).
 */

export interface ComparisonOptions {
    /** If true, ignores changes in the amount of whitespace (like diff -b). Default: true. */
    ignoreSpaceChange?: boolean;
    /** If true, ignores differences whose lines are completely blank (like diff -B). Default: true. */
    ignoreBlankLines?: boolean;
    /** If true, strips trailing \r / CRLF before comparing. Default: true. */
    stripTrailingCr?: boolean;
}

export interface ComparisonResult {
    matched: boolean;
    actualNormalized: string;
    expectedNormalized: string;
    diffLine?: number;
    reason?: string;
}

/**
 * Normalizes an output string according to LCArena judging policy.
 */
export function normalizeOutput(
    raw: string,
    options: ComparisonOptions = {}
): string {
    const {
        ignoreSpaceChange = true,
        ignoreBlankLines = true,
        stripTrailingCr = true,
    } = options;

    let text = raw;

    // 1. Strip \r / CRLF
    if (stripTrailingCr) {
        text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    }

    // 2. Split into lines
    let lines = text.split("\n");

    // 3. Process each line
    lines = lines.map((line) => {
        // Strip trailing whitespace
        let trimmed = line.replace(/[ \t]+$/, "");
        if (ignoreSpaceChange) {
            // Normalize internal consecutive whitespace runs to single space
            trimmed = trimmed.replace(/[ \t]+/g, " ").trim();
        }
        return trimmed;
    });

    // 4. Optionally filter out blank lines
    if (ignoreBlankLines) {
        lines = lines.filter((l) => l.length > 0);
    } else {
        // Remove only trailing blank lines at end of output
        while (lines.length > 0 && lines[lines.length - 1] === "") {
            lines.pop();
        }
    }

    return lines.join("\n");
}

/**
 * Compares actual program output against expected answer.
 */
export function compareOutputs(
    actual: string,
    expected: string,
    options: ComparisonOptions = {}
): ComparisonResult {
    const actualNorm = normalizeOutput(actual, options);
    const expectedNorm = normalizeOutput(expected, options);

    if (actualNorm === expectedNorm) {
        return {
            matched: true,
            actualNormalized: actualNorm,
            expectedNormalized: expectedNorm,
        };
    }

    // Find the first line where they diverge
    const actualLines = actualNorm.split("\n");
    const expectedLines = expectedNorm.split("\n");
    const maxLines = Math.max(actualLines.length, expectedLines.length);

    let diffLine = -1;
    let reason = "Outputs differ";

    for (let i = 0; i < maxLines; i++) {
        const act = actualLines[i];
        const exp = expectedLines[i];
        if (act !== exp) {
            diffLine = i + 1;
            if (act === undefined) {
                reason = `Line ${diffLine}: Missing output (expected '${exp}')`;
            } else if (exp === undefined) {
                reason = `Line ${diffLine}: Unexpected extra output '${act}'`;
            } else {
                reason = `Line ${diffLine}: Expected '${exp}', got '${act}'`;
            }
            break;
        }
    }

    return {
        matched: false,
        actualNormalized: actualNorm,
        expectedNormalized: expectedNorm,
        diffLine,
        reason,
    };
}
