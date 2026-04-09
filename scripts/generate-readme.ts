import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { arch, cpus, platform, release, totalmem } from "node:os";
import { join } from "node:path";
import type { ChartConfiguration } from "chart.js";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";

const FILES_SOURCE_URL_PREFIX =
	"https://raw.githubusercontent.com/yuku-toolchain/parser-benchmark-files/refs/heads/main";

const PARSERS = {
	yuku: {
		name: "Yuku",
		language: "Zig",
		description:
			"A high-performance & spec-compliant JavaScript/TypeScript compiler written in Zig.",
		url: "https://github.com/yuku-toolchain/yuku",
		semantic: false,
	},
	oxc: {
		name: "Oxc",
		language: "Rust",
		description:
			"A high-performance JavaScript and TypeScript parser written in Rust.",
		url: "https://github.com/oxc-project/oxc",
		semantic: false,
	},
	swc: {
		name: "SWC",
		language: "Rust",
		description:
			"An extensible Rust-based platform for compiling and bundling JavaScript and TypeScript.",
		url: "https://github.com/swc-project/swc",
		semantic: false,
	},
	yuku_semantic: {
		name: "Yuku + Semantic",
		language: "Zig",
		description: "Yuku parser with semantic analysis.",
		url: "https://github.com/yuku-toolchain/yuku",
		semantic: true,
	},
	oxc_semantic: {
		name: "Oxc + Semantic",
		language: "Rust",
		description: "Oxc parser with semantic analysis.",
		url: "https://github.com/oxc-project/oxc",
		semantic: true,
	},
	jam: {
		name: "Jam",
		language: "Zig",
		description:
			"A JavaScript toolchain written in Zig featuring a parser, linter, formatter, printer, and vulnerability scanner.",
		url: "https://github.com/srijan-paul/jam",
		semantic: false,
	},
} as const;

const CHART_COLORS: Record<string, string> = {
	yuku: "#FF6B35",
	oxc: "#F72585",
	swc: "#4CC9F0",
	yuku_semantic: "#E8890C",
	oxc_semantic: "#B5179E",
	jam: "#7209B7",
};

const FILES = {
	typescript: {
		path: "files/typescript.js",
		source_url: `${FILES_SOURCE_URL_PREFIX}/typescript.js`,
	},
	three: {
		path: "files/three.js",
		source_url: `${FILES_SOURCE_URL_PREFIX}/three.js`,
	},
	react: {
		path: "files/react.js",
		source_url: `${FILES_SOURCE_URL_PREFIX}/react.js`,
	},
} as const;

type ParserKey = keyof typeof PARSERS;
type FileKey = keyof typeof FILES;

interface BenchmarkResult {
	command: string;
	mean: number;
	stddev: number;
	median: number;
	min: number;
	max: number;
	memory_usage_byte?: number[];
}

interface ParserEntry {
	key: string;
	name: string;
	result: BenchmarkResult | null;
}

function formatBytes(bytes: number): string {
	return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatTime(seconds: number): string {
	return `${(seconds * 1000).toFixed(2)} ms`;
}

function formatMemory(bytes: number): string {
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getPeakMemory(result: BenchmarkResult): number | null {
	if (!result.memory_usage_byte || result.memory_usage_byte.length === 0)
		return null;
	return Math.max(...result.memory_usage_byte);
}

function extractParserName(command: string): string {
	const match = command.match(/\.\/bin\/(\w+)/);
	if (!match) return "unknown";
	const name = match[1];
	const keys = Object.keys(PARSERS).sort((a, b) => b.length - a.length);
	for (const key of keys) {
		if (name.startsWith(key + "_") || name === key) return key;
	}
	return "unknown";
}

async function readBenchmarkResults(fileKey: FileKey) {
	const content = await readFile(join(process.cwd(), "result", `${fileKey}.json`), "utf-8");
	return JSON.parse(content) as { results: BenchmarkResult[] };
}

function getParserEntries(data: { results: BenchmarkResult[] }, semantic: boolean): ParserEntry[] {
	const resultsByParser = new Map<string, BenchmarkResult>();
	for (const result of data.results) {
		const key = extractParserName(result.command);
		if (key !== "unknown" && PARSERS[key as ParserKey]) {
			resultsByParser.set(key, result);
		}
	}

	const entries: ParserEntry[] = [];
	for (const [key, parser] of Object.entries(PARSERS)) {
		if (parser.semantic !== semantic) continue;
		entries.push({ key, name: parser.name, result: resultsByParser.get(key) ?? null });
	}

	entries.sort((a, b) => {
		if (a.result && b.result) return a.result.mean - b.result.mean;
		if (a.result && !b.result) return -1;
		if (!a.result && b.result) return 1;
		return 0;
	});

	return entries;
}

async function generateChart(entries: ParserEntry[], chartName: string): Promise<string> {
	const data = entries.filter((e) => e.result != null);
	if (data.length === 0) return "";

	const labels = data.map((e) => e.name);
	const meanData = data.map((e) => e.result!.mean * 1000);
	const colors = data.map((e) => CHART_COLORS[e.key] ?? "#888888");

	const maxTime = Math.max(...meanData);
	const niceSteps = [10, 20, 25, 50, 100, 200, 250, 500];
	const rawStep = maxTime / 4;
	const step = niceSteps.find((s) => s >= rawStep) || Math.ceil(rawStep / 100) * 100;
	const chartMax = Math.ceil(maxTime / step) * step;

	const dpr = 3;
	const chartWidth = 500;
	const chartHeight = data.length * 24 + 28;

	const chartJSNodeCanvas = new ChartJSNodeCanvas({
		width: chartWidth * dpr,
		height: chartHeight * dpr,
	});

	const configuration: ChartConfiguration = {
		type: "bar",
		data: {
			labels,
			datasets: [
				{
					data: meanData,
					backgroundColor: colors,
					borderWidth: 0,
					borderRadius: 0,
					barPercentage: 0.75,
					categoryPercentage: 0.92,
				},
			],
		},
		options: {
			indexAxis: "y",
			responsive: false,
			devicePixelRatio: 1,
			layout: {
				padding: { right: 65 * dpr, top: 2 * dpr, bottom: 0 },
			},
			plugins: {
				legend: { display: false },
				title: { display: false },
			},
			scales: {
				x: { display: false, beginAtZero: true, max: chartMax },
				y: {
					grid: { display: false },
					border: { display: false },
					ticks: {
						color: "#CAC1B0",
						font: { size: 9 * dpr },
						padding: 3 * dpr,
					},
				},
			},
		},
		plugins: [
			{
				id: "value-labels",
				afterDatasetsDraw(chart) {
					const ctx = chart.ctx;
					const meta = chart.getDatasetMeta(0);
					const dataset = chart.data.datasets[0];
					for (let i = 0; i < meta.data.length; i++) {
						const bar = meta.data[i];
						const value = dataset.data[i] as number;
						ctx.save();
						ctx.fillStyle = "#CAC1B0";
						ctx.font = `${9 * dpr}px sans-serif`;
						ctx.textAlign = "left";
						ctx.textBaseline = "middle";
						ctx.fillText(`${value.toFixed(2)}ms`, bar.x + 8 * dpr, bar.y);
						ctx.restore();
					}
				},
			},
		],
	};

	const imageBuffer = await chartJSNodeCanvas.renderToBuffer(configuration);
	const chartPath = join(process.cwd(), "charts", `${chartName}.png`);
	await mkdir(join(process.cwd(), "charts"), { recursive: true });
	await writeFile(chartPath, imageBuffer);

	return `charts/${chartName}.png`;
}

function generateTable(entries: ParserEntry[]): string {
	const hasMemoryData = entries.some(
		({ result }) => result && getPeakMemory(result) !== null,
	);

	const lines: string[] = [];

	if (hasMemoryData) {
		lines.push("| Parser | Mean | Min | Max | Peak Memory (RSS) |");
		lines.push("|--------|------|-----|-----|----|");
	} else {
		lines.push("| Parser | Mean | Min | Max |");
		lines.push("|--------|------|-----|-----|");
	}

	for (const { name, result } of entries) {
		if (!result) {
			lines.push(hasMemoryData
				? `| ${name} | Failed to parse | - | - | - |`
				: `| ${name} | Failed to parse | - | - |`);
			continue;
		}

		const memory = getPeakMemory(result);
		const memoryStr = memory ? formatMemory(memory) : "-";
		lines.push(hasMemoryData
			? `| ${name} | ${formatTime(result.mean)} | ${formatTime(result.min)} | ${formatTime(result.max)} | ${memoryStr} |`
			: `| ${name} | ${formatTime(result.mean)} | ${formatTime(result.min)} | ${formatTime(result.max)} |`);
	}

	return lines.join("\n");
}

async function generateBenchmarksSection(): Promise<string> {
	const lines = ["## Benchmarks", ""];

	for (const [key, file] of Object.entries(FILES)) {
		const fileKey = key as FileKey;
		const fileName = file.path.split("/").pop()!;
		const fileSize = (await stat(join(process.cwd(), file.path))).size;
		const data = await readBenchmarkResults(fileKey);
		const entries = getParserEntries(data, false);

		lines.push(`### [${fileName}](${file.source_url})`);
		lines.push("");
		lines.push(`**File size:** ${formatBytes(fileSize)}`);
		lines.push("");

		const chartPath = await generateChart(entries, fileKey);
		if (chartPath) {
			lines.push(`![${fileName} Performance](${chartPath})`);
			lines.push("");
		}

		lines.push(generateTable(entries));
		lines.push("");
	}

	return lines.join("\n");
}

async function generateSemanticSection(): Promise<string> {
	const lines: string[] = [];

	lines.push(`## Semantic`);
	lines.push("");
	lines.push(`The ECMAScript specification defines a set of early errors that conformant implementations must report before execution. Some of these are detectable during parsing from local context alone, like \`return\` outside a function, \`yield\` outside a generator, invalid destructuring, etc. Others require knowledge of the program's scope structure and bindings, such as redeclarations, unresolved exports, private fields used outside their class, etc.`);
	lines.push("");
	lines.push(`Parsers handle this differently: SWC checks some scope-dependent errors during parsing itself, while Yuku and Oxc defer them entirely to a separate semantic analysis pass. This keeps parsing fast and lets each consumer opt in only to the work it actually needs. A formatter, for example, only needs the AST and should not pay the cost of scope resolution.`);
	lines.push("");
	lines.push(`The benchmarks below measure parsing followed by this additional pass, which builds a scope tree and symbol table, resolves identifier references to their declarations, and reports the remaining early errors. Together, parsing and semantic analysis cover the full set of early errors required by the specification.`);
	lines.push("");

	for (const [key, file] of Object.entries(FILES)) {
		const fileKey = key as FileKey;
		const fileName = file.path.split("/").pop()!;
		const data = await readBenchmarkResults(fileKey);
		const entries = getParserEntries(data, true);
		if (entries.every((e) => e.result == null)) continue;

		lines.push(`### [${fileName}](${file.source_url})`);
		lines.push("");

		const chartPath = await generateChart(entries, `${fileKey}_semantic`);
		if (chartPath) {
			lines.push(`![${fileName} Semantic Performance](${chartPath})`);
			lines.push("");
		}

		lines.push(generateTable(entries));
		lines.push("");
	}

	return lines.join("\n");
}

function generateParsersSection(): string {
	const lines = ["## Parsers", ""];

	for (const [, parser] of Object.entries(PARSERS)) {
		if (parser.semantic) continue;
		lines.push(`### [${parser.name}](${parser.url})`);
		lines.push("");
		lines.push(`**Language:** ${parser.language}`);
		lines.push("");
		lines.push(parser.description);
		lines.push("");
	}

	return lines.join("\n");
}

function getSystemInfo(): string {
	const cpu = cpus()[0];
	const cpuModel = cpu?.model || "Unknown CPU";
	const cpuCores = cpus().length;
	const totalMemoryGB = (totalmem() / (1024 * 1024 * 1024)).toFixed(0);
	const os = platform();
	const osArch = arch();
	const osRelease = release();
	const osName = os === "darwin" ? "macOS" : os === "win32" ? "Windows" : os === "linux" ? "Linux" : os;

	return `## System

| Property | Value |
|----------|-------|
| OS | ${osName} ${osRelease} (${osArch}) |
| CPU | ${cpuModel} |
| Cores | ${cpuCores} |
| Memory | ${totalMemoryGB} GB |`;
}

function generateRunSection(): string {
	return `## Run Benchmarks

### Prerequisites

- [Bun](https://bun.sh/) - JavaScript runtime and package manager
- [Rust](https://www.rust-lang.org/tools/install) - For building Rust-based parsers
- [Zig](https://ziglang.org/download/) - For building Zig-based parsers (requires nightly/development version)
- [Hyperfine](https://github.com/sharkdp/hyperfine) - Command-line benchmarking tool

### Steps

1. Clone the repository:

\`\`\`bash
git clone https://github.com/yuku-toolchain/parser-benchmark-native.git
cd parser-benchmark-native
\`\`\`

2. Install dependencies:

\`\`\`bash
bun install
\`\`\`

3. Run benchmarks:

\`\`\`bash
bun bench
\`\`\`

This will build all parsers and run benchmarks on all test files. Results are saved to the \`result/\` directory.`;
}

function generateMethodologySection(): string {
	return `## Methodology

All parsers are compiled with release optimizations. Source files are embedded at compile time (Zig \`@embedFile\`, Rust \`include_str!\`) to eliminate file I/O from measurements. Rust parsers are built with \`cargo build --release\` using LTO, a single codegen unit, and symbol stripping. Zig parsers are built with \`zig build --release=fast\`.

Each parser is benchmarked using [Hyperfine](https://github.com/sharkdp/hyperfine) with warmup runs followed by multiple timed runs. Each run measures the time to parse the entire file into an AST and free the allocated memory.`;
}

async function main() {
	const readme = [
		"# ECMAScript Native Parser Benchmark",
		"",
		"Benchmark ECMAScript parsers compiled to native binaries, measuring raw parsing speed without JavaScript runtime overhead.",
		"",
		getSystemInfo(),
		"",
		generateParsersSection(),
		await generateBenchmarksSection(),
		await generateSemanticSection(),
		generateRunSection(),
		"",
		generateMethodologySection(),
	].join("\n");

	await writeFile(join(process.cwd(), "README.md"), readme);
	console.log("README.md generated successfully!");
}

main().catch(console.error);
