# ECMAScript Native Parser Benchmark

Benchmark ECMAScript parsers implemented in native languages.

## System

| Property | Value |
|----------|-------|
| OS | macOS 24.6.0 (arm64) |
| CPU | Apple M3 |
| Cores | 8 |
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

| Parser | Mean | Min | Max |
|--------|------|-----|-----|
| Oxc | 28.68 ms | 28.15 ms | 29.35 ms |
| Oxc + Semantic | 65.28 ms | 64.39 ms | 66.80 ms |
| Yuku | 30.15 ms | 29.51 ms | 33.42 ms |
| Yuku + Semantic | 48.82 ms | 48.23 ms | 49.58 ms |
| Jam | 54.62 ms | 53.64 ms | 57.12 ms |
| SWC | 57.15 ms | 56.29 ms | 57.74 ms |

### [Three.js](https://raw.githubusercontent.com/yuku-toolchain/parser-benchmark-files/refs/heads/main/three.js)

A popular 3D graphics library for the web.

**File size:** 1.96 MB

![Three.js Performance](charts/three.png)

| Parser | Mean | Min | Max |
|--------|------|-----|-----|
| Oxc | 7.49 ms | 7.19 ms | 8.22 ms |
| Oxc + Semantic | 14.02 ms | 13.63 ms | 14.57 ms |
| Yuku | 8.21 ms | 7.88 ms | 8.97 ms |
| Yuku + Semantic | 12.08 ms | 11.74 ms | 12.61 ms |
| SWC | 13.32 ms | 12.84 ms | 14.61 ms |
| Jam | 13.41 ms | 12.92 ms | 15.97 ms |

### [Ant Design](https://raw.githubusercontent.com/yuku-toolchain/parser-benchmark-files/refs/heads/main/antd.js)

A popular React UI component library with enterprise-class design.

**File size:** 5.43 MB

![Ant Design Performance](charts/antd.png)

| Parser | Mean | Min | Max |
|--------|------|-----|-----|
| Oxc | 24.35 ms | 23.32 ms | 26.03 ms |
| Oxc + Semantic | 47.71 ms | 47.32 ms | 48.61 ms |
| Yuku | 24.46 ms | 23.25 ms | 37.16 ms |
| Yuku + Semantic | 38.37 ms | 37.38 ms | 57.43 ms |
| SWC | 44.35 ms | 43.62 ms | 47.41 ms |
| Jam | Failed to parse | - | - |

## What is Semantic?

The ECMAScript specification defines a set of early errors that conformant implementations must report before execution. Some of these are detectable during parsing from local context alone, like `return` outside a function, `yield` outside a generator, invalid destructuring, etc. Others require knowledge of the program's scope structure and bindings, such as redeclarations, unresolved exports, private fields used outside their class, etc.

Parsers handle this differently: SWC checks some scope-dependent errors during parsing itself, while Yuku and Oxc defer them entirely to a separate semantic analysis pass. This keeps parsing fast and lets each consumer opt in only to the work it actually needs. A formatter, for example, only needs the AST and should not pay the cost of scope resolution.

The **"+ Semantic"** rows measure parsing followed by this additional pass, which builds a scope tree and symbol table, resolves identifier references to their declarations, and reports the remaining early errors. Together, parsing and semantic analysis cover the full set of early errors required by the specification.

## Run Benchmarks

### Prerequisites

- [Bun](https://bun.sh/) - JavaScript runtime and package manager
- [Rust](https://www.rust-lang.org/tools/install) - For building Rust-based parsers
- [Zig](https://ziglang.org/download/) - For building Zig-based parsers (requires nightly/development version)
- [Hyperfine](https://github.com/sharkdp/hyperfine) - Command-line benchmarking tool

### Steps

1. Clone the repository:

```bash
git clone https://github.com/yuku-toolchain/ecmascript-native-parser-benchmark.git
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