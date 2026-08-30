import winston from "winston";

const { combine, timestamp, colorize, printf, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
	const metaString =
		Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";

	return `${timestamp} [${level}] ${stack || message}${metaString}`;
});

const winstonLogger = winston.createLogger({
	level: process.env.LOG_LEVEL || "info",

	format: combine(
		errors({ stack: true }),
		timestamp({
			format: "YYYY-MM-DD HH:mm:ss",
		}),
		colorize(),
		logFormat
	),

	transports: [new winston.transports.Console()],

	exitOnError: false,
});

interface Logger extends winston.Logger {
	table(data: Record<string, unknown>[]): void;
}

const logger = winstonLogger as Logger;

logger.table = (data: Record<string, unknown>[]) => {
	if (!Array.isArray(data) || data.length === 0) {
		logger.info("Table is empty");
		return;
	}

	// Get all possible columns
	const columns = Array.from(
		new Set(data.flatMap((row) => Object.keys(row)))
	);

	// Convert all values to strings
	const rows = data.map((row) =>
		columns.map((column) => String(row[column] ?? ""))
	);

	// Calculate column widths
	const widths = columns.map((column, index) => {
		const values = [column, ...rows.map((row) => row[index])];

		return Math.max(...values.map((value) => value.length));
	});

	// +---------+-----------+
	// | column  | column    |
	// +---------+-----------+
	const separator =
		"+" + widths.map((width) => "-".repeat(width + 2)).join("+") + "+";

	const formatRow = (row: string[]) =>
		"| " +
		row.map((value, index) => value.padEnd(widths[index])).join(" | ") +
		" |";

	const table = [
		separator,
		formatRow(columns),
		separator,
		...rows.map(formatRow),
		separator,
	].join("\n");

	logger.info(`\n${table}`);
};

export {logger};
