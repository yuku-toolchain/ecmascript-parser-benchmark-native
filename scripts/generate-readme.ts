import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { arch, cpus, platform, release, totalmem } from "node:os";
import { join } from "node:path";

const FILES_SOURCE_URL_PREFIX =
  "https://raw.githubusercontent.com/yuku-toolchain/parser-benchmark-files/refs/heads/main";

const PARSERS = {
  yuku: {
    name: "Yuku",
    language: "Zig",
    description:
      "A high-performance & spec-compliant JavaScript/TypeScript compiler toolchain written in Zig.",
    url: "https://github.com/yuku-toolchain/yuku",
    semantic: false,
  },
  oxc: {
    name: "Oxc",
    language: "Rust",
    description: "A high-performance JavaScript and TypeScript parser written in Rust.",
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
  swc_next: {
    name: "SWC Next",
    language: "Rust",
    description: "The next-generation SWC JavaScript and TypeScript parser.",
    url: "https://github.com/swc-project/swc-next",
    semantic: false,
  },
  swc_next_semantic: {
    name: "SWC Next + Semantic",
    language: "Rust",
    description: "SWC Next parser with semantic analysis and syntax checks.",
    url: "https://github.com/swc-project/swc-next",
    semantic: true,
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
} as const;

const CHART_COLORS: Record<string, string> = {
  yuku: "#FF6B35",
  oxc: "#F72585",
  swc: "#4CC9F0",
  swc_next: "#2DBD85",
  swc_next_semantic: "#218F65",
  yuku_semantic: "#E8890C",
  oxc_semantic: "#B5179E",
};

const FILES = {
  typescript: {
    path: "files/typescript.js",
    source_url: `${FILES_SOURCE_URL_PREFIX}/typescript.js`,
  },
  checker: {
    path: "files/checker.ts",
    source_url: `${FILES_SOURCE_URL_PREFIX}/checker.ts`,
  },
  lib_dom: {
    path: "files/lib.dom.d.ts",
    source_url: `${FILES_SOURCE_URL_PREFIX}/lib.dom.d.ts`,
  },
  react: {
    path: "files/react.js",
    source_url: `${FILES_SOURCE_URL_PREFIX}/react.js`,
  },
} as const;

type ParserKey = keyof typeof PARSERS;
type FileKey = keyof typeof FILES;

interface BenchmarkResult {
  parser: string;
  median: number;
  min: number;
  p99: number;
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

async function readBenchmarkResults(fileKey: FileKey) {
  const content = await readFile(join(process.cwd(), "result", `${fileKey}.json`), "utf-8");
  return JSON.parse(content) as { results: BenchmarkResult[] };
}

function getParserEntries(data: { results: BenchmarkResult[] }, semantic: boolean): ParserEntry[] {
  const resultsByParser = new Map<string, BenchmarkResult>();
  for (const result of data.results) {
    if (PARSERS[result.parser as ParserKey]) {
      resultsByParser.set(result.parser, result);
    }
  }

  const entries: ParserEntry[] = [];
  for (const [key, parser] of Object.entries(PARSERS)) {
    if (parser.semantic !== semantic) continue;
    entries.push({ key, name: parser.name, result: resultsByParser.get(key) ?? null });
  }

  entries.sort((a, b) => {
    if (a.result && b.result) return a.result.median - b.result.median;
    if (a.result && !b.result) return -1;
    if (!a.result && b.result) return 1;
    return 0;
  });

  return entries;
}

function textWidth(text: string): number {
  let em = 0;
  for (const c of text) em += /[fijlrt\-. ]/.test(c) ? 0.35 : /[A-Zmw]/.test(c) ? 0.75 : 0.58;
  return Math.ceil(em * 13);
}

async function generateChart(entries: ParserEntry[], chartName: string): Promise<string> {
  const data = entries.filter((e) => e.result != null);
  if (data.length === 0) return "";

  const width = 640;
  const barX = Math.max(...data.map((e) => textWidth(e.name))) + 10;
  const fastest = Math.min(...data.map((e) => e.result!.median));
  const slowest = Math.max(...data.map((e) => e.result!.median));
  const rows = data.map(({ key, name, result }, index) => {
    const { median } = result!;
    const y = index * 30;
    const middle = y + 11;
    const barEnd = barX + Math.round((median / slowest) * (width - barX - 80));
    const row = [
      `<text x="${barX - 10}" y="${middle}" text-anchor="end">${name}</text>`,
      `<rect x="${barX}" y="${y}" width="${barEnd - barX}" height="22" rx="4" fill="${CHART_COLORS[key]}"/>`,
      `<text x="${barEnd + 8}" y="${middle}">${formatTime(median)}</text>`,
    ];
    if (median !== fastest) {
      const ratio = `${(median / fastest).toFixed(2)}×`;
      row.push(`<text class="ratio" x="${barEnd - 8}" y="${middle}" text-anchor="end">${ratio}</text>`);
    }
    return row.join("\n  ");
  });

  const height = data.length * 30 - 8;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <style>
    text { font: 13px -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif; fill: #848d97; dominant-baseline: central; font-variant-numeric: tabular-nums }
    .ratio { font-size: 12px; fill: #fff }
  </style>
  ${rows.join("\n  ")}
</svg>
`;

  await mkdir(join(process.cwd(), "charts"), { recursive: true });
  await writeFile(join(process.cwd(), "charts", `${chartName}.svg`), svg);
  return `charts/${chartName}.svg`;
}

function generateTable(entries: ParserEntry[]): string {
  const lines = [
    "| Parser | Median | Min | p99 | Relative |",
    "|--------|--------|-----|-----|----------|",
  ];

  const fastest = entries.reduce<number | null>(
    (min, e) => (e.result && (min === null || e.result.median < min) ? e.result.median : min),
    null,
  );

  for (const { name, result } of entries) {
    if (!result) {
      lines.push(`| ${name} | Failed to parse | - | - | - |`);
      continue;
    }
    const relative = fastest ? `${(result.median / fastest).toFixed(2)}×` : "-";
    lines.push(
      `| ${name} | ${formatTime(result.median)} | ${formatTime(result.min)} | ${formatTime(result.p99)} | ${relative} |`,
    );
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
      lines.push(`![Bar chart comparing native parser speeds for ${fileName}](${chartPath})`);
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
  lines.push(
    `The ECMAScript specification defines a set of early errors that conformant implementations must report before execution. Some of these are detectable during parsing from local context alone, like \`return\` outside a function, \`yield\` outside a generator, invalid destructuring, etc. Others require knowledge of the program's scope structure and bindings, such as redeclarations, unresolved exports, private fields used outside their class, etc.`,
  );
  lines.push("");
  lines.push(
    `Parsers handle this differently: SWC checks some scope-dependent errors during parsing itself, while Yuku, Oxc, and SWC Next provide a separate semantic analysis pass. This keeps parsing fast and lets each consumer opt in only to the work it actually needs. A formatter, for example, only needs the AST and should not pay the cost of scope resolution.`,
  );
  lines.push("");
  lines.push(
    `The benchmarks below measure parsing followed by this additional pass, which builds a scope tree and symbol table, resolves identifier references to their declarations, and reports the remaining early errors. SWC Next enables \`SyntaxChecks::all()\`; Yuku enables \`check = true\`. These timings do not establish equivalent conformance coverage.`,
  );
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
      lines.push(
        `![Bar chart comparing parser speeds with semantic analysis for ${fileName}](${chartPath})`,
      );
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
  const osName =
    os === "darwin" ? "macOS" : os === "win32" ? "Windows" : os === "linux" ? "Linux" : os;

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
- [Zig](https://ziglang.org/download/) 0.17.0 - Required by Yuku 0.27.0

### Steps

1. Clone the repository:

\`\`\`bash
git clone https://github.com/yuku-toolchain/ecmascript-parser-benchmark-native.git
cd ecmascript-parser-benchmark-native
\`\`\`

2. Install dependencies:

\`\`\`bash
bun install
\`\`\`

3. Download the benchmark files:

\`\`\`bash
bun load-files
\`\`\`

4. Build the parsers:

\`\`\`bash
bun run build
\`\`\`

5. Run benchmarks:

\`\`\`bash
bun bench
\`\`\`

This will run benchmarks on all test files. Results are saved to the \`result/\` directory.`;
}

function generateMethodologySection(): string {
  return `## Methodology

Parsing is timed in-process to isolate it from process startup, dynamic linking, file I/O, and memory teardown, which would otherwise dominate the measurement on smaller files.

The source is read once, then each parser runs 50 warmup iterations followed by 300 timed iterations. A monotonic clock wraps only the parse call (plus the semantic pass for the semantic variants); allocation and teardown happen outside the timed region, and the result passes through an optimization barrier so the work cannot be elided. Reported figures are the median, minimum, and 99th percentile of the timed runs.

Binaries are built with release optimizations: Rust with \`cargo build --release\` (LTO, single codegen unit, symbol stripping) and Zig with \`zig build --release=fast\`. Each uses a fast general-purpose allocator (Rust \`mimalloc\`, Zig \`smp_allocator\`).`;
}

async function main() {
  const readme = [
    "# Native ECMAScript Parser Benchmark",
    "",
    "Benchmarks for ECMAScript parsers compiled to native binaries (Zig, Rust), measuring raw parsing speed without any JavaScript runtime overhead.",
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
