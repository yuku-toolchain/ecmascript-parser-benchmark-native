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
		description:
			"Yuku parser with semantic analysis.",
		url: "https://github.com/yuku-toolchain/yuku",
		semantic: true,
	},
	oxc_semantic: {
		name: "Oxc + Semantic",
		language: "Rust",
		description:
			"Oxc parser with semantic analysis.",
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

const FILES = {
	typescript: {
		name: "TypeScript",
		description:
			"The TypeScript compiler source code bundled into a single file.",
		path: "files/typescript.js",
		source_url: `${FILES_SOURCE_URL_PREFIX}/typescript.js`,
	},
	three: {
		name: "Three.js",
		description: "A popular 3D graphics library for the web.",
		path: "files/three.js",
		source_url: `${FILES_SOURCE_URL_PREFIX}/three.js`,
	},
	antd: {
		name: "Ant Design",
		description:
			"A popular React UI component library with enterprise-class design.",
		path: "files/antd.js",
		source_url: `${FILES_SOURCE_URL_PREFIX}/antd.js`,
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

interface BenchmarkData {
	results: BenchmarkResult[];
}

function formatBytes(bytes: number): string {
	const mb = bytes / (1024 * 1024);
	return `${mb.toFixed(2)} MB`;
}

function formatTime(seconds: number): string {
	const ms = seconds * 1000;
	return `${ms.toFixed(2)} ms`;
}

function formatMemory(bytes: number): string {
	const mb = bytes / (1024 * 1024);
	return `${mb.toFixed(1)} MB`;
}

function getPeakMemory(result: BenchmarkResult): number | null {
	if (!result.memory_usage_byte || result.memory_usage_byte.length === 0)
		return null;
	return Math.max(...result.memory_usage_byte);
}

const CHART_COLORS = {
	yuku: "#FF6B35",
	oxc: "#F72585",
	swc: "#4CC9F0",
	yuku_semantic: "#E8890C",
	oxc_semantic: "#B5179E",
	jam: "#7209B7",
};

async function generatePerformanceChart(fileKey: FileKey): Promise<string> {
	const data = await readBenchmarkResults(fileKey);

	const resultsByParser = new Map<ParserKey, BenchmarkResult>();
	for (const result of data.results) {
		const parserKey = extractParserName(result.command) as ParserKey;
		if (PARSERS[parserKey]) {
			resultsByParser.set(parserKey, result);
		}
	}

	const parserData: Array<{
		key: string;
		name: string;
		mean: number;
		color: string;
		semantic: boolean;
	}> = [];

	for (const [key, parser] of Object.entries(PARSERS)) {
		const parserKey = key as ParserKey;
		const result = resultsByParser.get(parserKey);
		if (result) {
			parserData.push({
				key,
				name: parser.name,
				mean: result.mean * 1000,
				color: CHART_COLORS[parserKey],
				semantic: parser.semantic,
			});
		}
	}

	const nonSemantic = parserData.filter((p) => !p.semantic);
	const semantic = parserData.filter((p) => p.semantic);
	nonSemantic.sort((a, b) => a.mean - b.mean);
	const sortedData: typeof parserData = [];
	for (const entry of nonSemantic) {
		sortedData.push(entry);
		const semanticEntry = semantic.find((s) => s.key === `${entry.key}_semantic`);
		if (semanticEntry) sortedData.push(semanticEntry);
	}
	parserData.length = 0;
	parserData.push(...sortedData);

	const barCount = parserData.length;
	const chartWidth = 500;
	const chartHeight = barCount * 24 + 28;

	const labels = parserData.map((p) => p.name);
	const meanData = parserData.map((p) => p.mean);
	const colors = parserData.map((p) => p.color);

	const maxTime = Math.max(...meanData);
	const niceSteps = [10, 20, 25, 50, 100, 200, 250, 500];
	const rawStep = maxTime / 4;
	const step =
		niceSteps.find((s) => s >= rawStep) || Math.ceil(rawStep / 100) * 100;
	const chartMax = Math.ceil(maxTime / step) * step;

	const dpr = 3;
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
				padding: {
					right: 65 * dpr,
					top: 2 * dpr,
					bottom: 0,
				},
			},
			plugins: {
				legend: { display: false },
				title: { display: false },
			},
			scales: {
				x: {
					display: false,
					beginAtZero: true,
					max: chartMax,
				},
				y: {
					grid: { display: false },
					border: { display: false },
					ticks: {
						color: "#CAC1B0",
						font: {
							size: 9 * dpr,
							weight: "500",
						},
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
						ctx.fillText(
							`${value.toFixed(2)}ms`,
							bar.x + 8 * dpr,
							bar.y,
						);
						ctx.restore();
					}
				},
			},
		],
	};

	const imageBuffer = await chartJSNodeCanvas.renderToBuffer(configuration);
	const chartPath = join(process.cwd(), "charts", `${fileKey}.png`);
	await mkdir(join(process.cwd(), "charts"), { recursive: true });
	await writeFile(chartPath, imageBuffer);

	return `charts/${fileKey}.png`;
}

function extractParserName(command: string): string {
	const match = command.match(/\.\/bin\/(\w+)/);
	if (!match) return "unknown";
	const name = match[1];
	const keys = Object.keys(PARSERS).sort((a, b) => b.length - a.length);
	for (const key of keys) {
		if (name.startsWith(key + "_") || name === key) {
			return key;
		}
	}
	return "unknown";
}

async function getFileSize(filePath: string): Promise<number> {
	const stats = await stat(filePath);
	return stats.size;
}

async function readBenchmarkResults(fileKey: FileKey): Promise<BenchmarkData> {
	const resultPath = join(process.cwd(), "result", `${fileKey}.json`);
	const content = await readFile(resultPath, "utf-8");
	return JSON.parse(content);
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

function generateSemanticSection(): string {
	return `## What is Semantic?

The ECMAScript specification defines a set of early errors that conformant implementations must report before execution. Some of these are detectable during parsing from local context alone, like \`return\` outside a function, \`yield\` outside a generator, invalid destructuring, etc. Others require knowledge of the program's scope structure and bindings, such as redeclarations, unresolved exports, private fields used outside their class, etc.

Parsers handle this differently: SWC checks some scope-dependent errors during parsing itself, while Yuku and Oxc defer them entirely to a separate semantic analysis pass. This keeps parsing fast and lets each consumer opt in only to the work it actually needs. A formatter, for example, only needs the AST and should not pay the cost of scope resolution.

The **"+ Semantic"** rows measure parsing followed by this additional pass, which builds a scope tree and symbol table, resolves identifier references to their declarations, and reports the remaining early errors. Together, parsing and semantic analysis cover the full set of early errors required by the specification.`;
}

async function generateBenchmarkTable(fileKey: FileKey): Promise<string> {
	const data = await readBenchmarkResults(fileKey);
	const lines: string[] = [];

	const resultsByParser = new Map<ParserKey, BenchmarkResult>();
	for (const result of data.results) {
		const parserKey = extractParserName(result.command) as ParserKey;
		if (PARSERS[parserKey]) {
			resultsByParser.set(parserKey, result);
		}
	}

	const parserEntries: Array<{
		key: string;
		parser: (typeof PARSERS)[ParserKey];
		result: BenchmarkResult | null;
	}> = [];

	for (const [key, parser] of Object.entries(PARSERS)) {
		const parserKey = key as ParserKey;
		const result = resultsByParser.get(parserKey) || null;
		parserEntries.push({ key, parser, result });
	}

	const nonSemantic = parserEntries.filter((e) => !e.parser.semantic);
	const semantic = parserEntries.filter((e) => e.parser.semantic);

	nonSemantic.sort((a, b) => {
		if (a.result && b.result) return a.result.mean - b.result.mean;
		if (a.result && !b.result) return -1;
		if (!a.result && b.result) return 1;
		return 0;
	});

	const sorted: typeof parserEntries = [];
	for (const entry of nonSemantic) {
		sorted.push(entry);
		const semanticEntry = semantic.find((s) => s.key === `${entry.key}_semantic`);
		if (semanticEntry) sorted.push(semanticEntry);
	}

	const hasMemoryData = sorted.some(
		({ result }) => result && getPeakMemory(result) !== null,
	);

	if (hasMemoryData) {
		lines.push("| Parser | Mean | Min | Max | Peak Memory (RSS) |");
		lines.push("|--------|------|-----|-----|----|");
	} else {
		lines.push("| Parser | Mean | Min | Max |");
		lines.push("|--------|------|-----|-----|");
	}

	for (const { parser, result } of sorted) {
		if (result) {
			if (hasMemoryData) {
				const memory = getPeakMemory(result);
				const memoryStr = memory ? formatMemory(memory) : "-";
				lines.push(
					`| ${parser.name} | ${formatTime(result.mean)} | ${formatTime(result.min)} | ${formatTime(result.max)} | ${memoryStr} |`,
				);
			} else {
				lines.push(
					`| ${parser.name} | ${formatTime(result.mean)} | ${formatTime(result.min)} | ${formatTime(result.max)} |`,
				);
			}
		} else {
			if (hasMemoryData) {
				lines.push(`| ${parser.name} | Failed to parse | - | - | - |`);
			} else {
				lines.push(`| ${parser.name} | Failed to parse | - | - |`);
			}
		}
	}

	return lines.join("\n");
}

async function generateBenchmarksSection(): Promise<string> {
	const lines = ["## Benchmarks", ""];

	for (const [key, file] of Object.entries(FILES)) {
		const fileKey = key as FileKey;
		const filePath = join(process.cwd(), file.path);
		const fileSize = await getFileSize(filePath);

		lines.push(`### [${file.name}](${file.source_url})`);
		lines.push("");
		lines.push(`${file.description}`);
		lines.push("");
		lines.push(`**File size:** ${formatBytes(fileSize)}`);
		lines.push("");

		const chartPath = await generatePerformanceChart(fileKey);
		lines.push(`![${file.name} Performance](${chartPath})`);
		lines.push("");

		const table = await generateBenchmarkTable(fileKey);
		lines.push(table);
		lines.push("");
	}

	return lines.join("\n");
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
git clone https://github.com/yuku-toolchain/ecmascript-native-parser-benchmark.git
cd ecmascript-native-parser-benchmark
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

function getSystemInfo(): string {
	const cpu = cpus()[0];
	const cpuModel = cpu?.model || "Unknown CPU";
	const cpuCores = cpus().length;
	const totalMemoryGB = (totalmem() / (1024 * 1024 * 1024)).toFixed(0);
	const os = platform();
	const osArch = arch();
	const osRelease = release();

	const osName =
		os === "darwin"
			? "macOS"
			: os === "win32"
				? "Windows"
				: os === "linux"
					? "Linux"
					: os;

	return `## System

| Property | Value |
|----------|-------|
| OS | ${osName} ${osRelease} (${osArch}) |
| CPU | ${cpuModel} |
| Cores | ${cpuCores} |
| Memory | ${totalMemoryGB} GB |`;
}

function generateMethodologySection(): string {
	return `## Methodology

### How Benchmarks Are Conducted

1. **Build Phase**: All parsers are compiled with release optimizations. Source files are embedded at compile time (Zig \`@embedFile\`, Rust \`include_str!\`) to eliminate file I/O from measurements:
   - Rust parsers: \`cargo build --release\` with LTO, single codegen unit, and symbol stripping
   - Zig parsers: \`zig build --release=fast\`

2. **Benchmark Phase**: Each parser is benchmarked using [Hyperfine](https://github.com/sharkdp/hyperfine):
   - 100 warmup runs to ensure stable measurements
   - Multiple timed runs for statistical accuracy
   - Results exported to JSON for analysis

3. **Measurement**: Each benchmark measures the total time to:
   - Parse the entire file into an AST (source is embedded at compile time, no file I/O)
   - Clean up allocated memory

### Test Files

The benchmark uses real-world JavaScript files from popular open-source projects to ensure results reflect practical performance characteristics.`;
}

async function generateReadme(): Promise<string> {
	const lines = [
		"# ECMAScript Native Parser Benchmark",
		"",
		"Benchmark ECMAScript parsers implemented in native languages.",
		"",
		getSystemInfo(),
		"",
		generateParsersSection(),
		await generateBenchmarksSection(),
		generateSemanticSection(),
		"",
		generateRunSection(),
		"",
		generateMethodologySection(),
	];

	return lines.join("\n");
}

async function main() {
	const readme = await generateReadme();
	await writeFile(join(process.cwd(), "README.md"), readme);
	console.log("README.md generated successfully!");
}

main().catch(console.error);
