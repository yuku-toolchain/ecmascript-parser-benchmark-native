# ECMAScript Native Parser Benchmark

Benchmark ECMAScript parsers implemented in native languages.

## System

| Property | Value |
|----------|-------|
| OS | Linux 6.14.0-1017-azure (x64) |
| CPU | AMD EPYC 7763 64-Core Processor |
| Cores | 4 |
| Memory | 16 GB |

## Parsers

### [Yuku](https://github.com/yuku-toolchain/yuku)

**Language:** Zig

A high-performance & spec-compliant JavaScript/TypeScript compiler written in Zig.

### [Oxc](https://github.com/oxc-project/oxc)

**Language:** Rust

A high-performance JavaScript and TypeScript parser written in Rust.

### [SWC](https://github.com/swc-project/swc)

**Language:** Rust

An extensible Rust-based platform for compiling and bundling JavaScript and TypeScript.

### [Jam](https://github.com/srijan-paul/jam)

**Language:** Zig

A JavaScript toolchain written in Zig featuring a parser, linter, formatter, printer, and vulnerability scanner.

## Benchmarks

### [TypeScript](https://raw.githubusercontent.com/yuku-toolchain/parser-benchmark-files/refs/heads/main/typescript.js)

The TypeScript compiler source code bundled into a single file.

**File size:** 7.83 MB

![TypeScript Performance](charts/typescript.png)

| Parser | Mean | Min | Max | Peak Memory (RSS) |
|--------|------|-----|-----|----|
| Oxc | 77.53 ms | 76.27 ms | 82.08 ms | 52.9 MB |
| Yuku | 77.54 ms | 76.47 ms | 89.08 ms | 39.7 MB |
| SWC | 167.98 ms | 165.68 ms | 172.01 ms | 89.7 MB |
| Jam | 200.39 ms | 198.85 ms | 202.06 ms | 186.1 MB |

### [Three.js](https://raw.githubusercontent.com/yuku-toolchain/parser-benchmark-files/refs/heads/main/three.js)

A popular 3D graphics library for the web.

**File size:** 1.96 MB

![Three.js Performance](charts/three.png)

| Parser | Mean | Min | Max | Peak Memory (RSS) |
|--------|------|-----|-----|----|
| Oxc | 17.48 ms | 17.14 ms | 18.99 ms | 13.4 MB |
| Yuku | 18.91 ms | 18.26 ms | 20.58 ms | 10.3 MB |
| SWC | 36.28 ms | 35.21 ms | 38.05 ms | 22.4 MB |
| Jam | 44.45 ms | 43.28 ms | 46.11 ms | 39.5 MB |

### [Ant Design](https://raw.githubusercontent.com/yuku-toolchain/parser-benchmark-files/refs/heads/main/antd.js)

A popular React UI component library with enterprise-class design.

**File size:** 5.43 MB

![Ant Design Performance](charts/antd.png)

| Parser | Mean | Min | Max | Peak Memory (RSS) |
|--------|------|-----|-----|----|
| Yuku | 60.75 ms | 60.20 ms | 62.70 ms | 30.5 MB |
| Oxc | 62.13 ms | 61.43 ms | 63.11 ms | 41.0 MB |
| SWC | 130.38 ms | 128.53 ms | 132.49 ms | 67.4 MB |
| Jam | Failed to parse | - | - | - |

## Run Benchmarks

### Prerequisites

- [Bun](https://bun.sh/) - JavaScript runtime and package manager
- [Rust](https://www.rust-lang.org/tools/install) - For building Rust-based parsers
- [Zig](https://ziglang.org/download/) - For building Zig-based parsers (requires nightly/development version)
- [Hyperfine](https://github.com/sharkdp/hyperfine) - Command-line benchmarking tool

### Steps

1. Clone the repository:

```bash
git clone https://github.com/arshad-yaseen/ecmascript-native-parser-benchmark.git
cd ecmascript-native-parser-benchmark
```

2. Install dependencies:

```bash
bun install
```

3. Run benchmarks:

```bash
bun bench
```

This will build all parsers and run benchmarks on all test files. Results are saved to the `result/` directory.

## Methodology

### How Benchmarks Are Conducted

1. **Build Phase**: All parsers are compiled with release optimizations. Source files are embedded at compile time (Zig `@embedFile`, Rust `include_str!`) to eliminate file I/O from measurements:
   - Rust parsers: `cargo build --release` with LTO, single codegen unit, and symbol stripping
   - Zig parsers: `zig build --release=fast`

2. **Benchmark Phase**: Each parser is benchmarked using [Hyperfine](https://github.com/sharkdp/hyperfine):
   - 100 warmup runs to ensure stable measurements
   - Multiple timed runs for statistical accuracy
   - Results exported to JSON for analysis

3. **Measurement**: Each benchmark measures the total time to:
   - Parse the entire file into an AST (source is embedded at compile time, no file I/O)
   - Clean up allocated memory

### Test Files

The benchmark uses real-world JavaScript files from popular open-source projects to ensure results reflect practical performance characteristics.