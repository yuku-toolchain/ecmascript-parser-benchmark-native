# ECMAScript Native Parser Benchmark

Benchmark ECMAScript parsers implemented in native languages.

## System

| Property | Value |
|----------|-------|
| OS | macOS 24.6.0 (arm64) |
| CPU | Apple M4 Pro (Virtual) |
| Cores | 6 |
| Memory | 14 GB |

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

### [typescript.js](https://raw.githubusercontent.com/yuku-toolchain/parser-benchmark-files/refs/heads/main/typescript.js)

**File size:** 7.83 MB

![typescript.js Performance](charts/typescript.png)

| Parser | Mean | Min | Max | Peak Memory (RSS) |
|--------|------|-----|-----|----|
| Yuku | 27.62 ms | 25.59 ms | 40.32 ms | 40.6 MB |
| Oxc | 27.66 ms | 25.05 ms | 42.42 ms | 53.0 MB |
| Jam | 50.48 ms | 47.13 ms | 64.78 ms | 186.9 MB |
| SWC | 56.31 ms | 50.14 ms | 66.38 ms | 89.0 MB |

### [three.js](https://raw.githubusercontent.com/yuku-toolchain/parser-benchmark-files/refs/heads/main/three.js)

**File size:** 1.96 MB

![three.js Performance](charts/three.png)

| Parser | Mean | Min | Max | Peak Memory (RSS) |
|--------|------|-----|-----|----|
| Oxc | 7.23 ms | 5.92 ms | 22.42 ms | 13.0 MB |
| Yuku | 7.73 ms | 6.42 ms | 26.49 ms | 11.5 MB |
| SWC | 12.41 ms | 10.64 ms | 23.04 ms | 21.4 MB |
| Jam | 13.08 ms | 11.13 ms | 28.92 ms | 40.3 MB |

### [antd.js](https://raw.githubusercontent.com/yuku-toolchain/parser-benchmark-files/refs/heads/main/antd.js)

**File size:** 5.43 MB

![antd.js Performance](charts/antd.png)

| Parser | Mean | Min | Max | Peak Memory (RSS) |
|--------|------|-----|-----|----|
| Yuku | 21.91 ms | 19.93 ms | 33.84 ms | 31.3 MB |
| Oxc | 23.64 ms | 20.63 ms | 40.09 ms | 40.9 MB |
| SWC | 41.56 ms | 38.08 ms | 54.58 ms | 66.4 MB |
| Jam | Failed to parse | - | - | - |

## Semantic

The ECMAScript specification defines a set of early errors that conformant implementations must report before execution. Some of these are detectable during parsing from local context alone, like `return` outside a function, `yield` outside a generator, invalid destructuring, etc. Others require knowledge of the program's scope structure and bindings, such as redeclarations, unresolved exports, private fields used outside their class, etc.

Parsers handle this differently: SWC checks some scope-dependent errors during parsing itself, while Yuku and Oxc defer them entirely to a separate semantic analysis pass. This keeps parsing fast and lets each consumer opt in only to the work it actually needs. A formatter, for example, only needs the AST and should not pay the cost of scope resolution.

The benchmarks below measure parsing followed by this additional pass, which builds a scope tree and symbol table, resolves identifier references to their declarations, and reports the remaining early errors. Together, parsing and semantic analysis cover the full set of early errors required by the specification.

### [typescript.js](https://raw.githubusercontent.com/yuku-toolchain/parser-benchmark-files/refs/heads/main/typescript.js)

![typescript.js Semantic Performance](charts/typescript_semantic.png)

| Parser | Mean | Min | Max | Peak Memory (RSS) |
|--------|------|-----|-----|----|
| Yuku + Semantic | 48.57 ms | 42.76 ms | 74.99 ms | 186.9 MB |
| Oxc + Semantic | 62.49 ms | 58.92 ms | 74.17 ms | 186.9 MB |

### [three.js](https://raw.githubusercontent.com/yuku-toolchain/parser-benchmark-files/refs/heads/main/three.js)

![three.js Semantic Performance](charts/three_semantic.png)

| Parser | Mean | Min | Max | Peak Memory (RSS) |
|--------|------|-----|-----|----|
| Yuku + Semantic | 12.08 ms | 9.93 ms | 31.84 ms | 40.3 MB |
| Oxc + Semantic | 13.50 ms | 11.70 ms | 28.87 ms | 40.3 MB |

### [antd.js](https://raw.githubusercontent.com/yuku-toolchain/parser-benchmark-files/refs/heads/main/antd.js)

![antd.js Semantic Performance](charts/antd_semantic.png)

| Parser | Mean | Min | Max | Peak Memory (RSS) |
|--------|------|-----|-----|----|
| Yuku + Semantic | 35.34 ms | 33.47 ms | 49.27 ms | 66.4 MB |
| Oxc + Semantic | 44.07 ms | 42.10 ms | 61.98 ms | 70.2 MB |

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

All parsers are compiled with release optimizations. Source files are embedded at compile time (Zig `@embedFile`, Rust `include_str!`) to eliminate file I/O from measurements. Rust parsers are built with `cargo build --release` using LTO, a single codegen unit, and symbol stripping. Zig parsers are built with `zig build --release=fast`.

Each parser is benchmarked using [Hyperfine](https://github.com/sharkdp/hyperfine) with warmup runs followed by multiple timed runs. Each run measures the time to parse the entire file into an AST and free the allocated memory.