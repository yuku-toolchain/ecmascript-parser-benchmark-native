# ECMAScript Native Parser Benchmark

Benchmark ECMAScript parsers compiled to native binaries, measuring raw parsing speed without JavaScript runtime overhead.

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
| Oxc | 28.07 ms | 25.44 ms | 45.56 ms | 53.1 MB |
| Yuku | 28.17 ms | 25.20 ms | 50.03 ms | 38.0 MB |
| Jam | 52.77 ms | 48.19 ms | 62.90 ms | 186.8 MB |
| SWC | 54.00 ms | 50.66 ms | 69.61 ms | 88.9 MB |

### [three.js](https://raw.githubusercontent.com/yuku-toolchain/parser-benchmark-files/refs/heads/main/three.js)

**File size:** 1.96 MB

![three.js Performance](charts/three.png)

| Parser | Mean | Min | Max | Peak Memory (RSS) |
|--------|------|-----|-----|----|
| Oxc | 6.97 ms | 5.78 ms | 20.34 ms | 13.0 MB |
| Yuku | 7.80 ms | 6.48 ms | 25.14 ms | 11.4 MB |
| SWC | 12.29 ms | 10.59 ms | 25.95 ms | 21.3 MB |
| Jam | 13.00 ms | 10.88 ms | 31.86 ms | 40.2 MB |

### [react.js](https://raw.githubusercontent.com/yuku-toolchain/parser-benchmark-files/refs/heads/main/react.js)

**File size:** 0.07 MB

![react.js Performance](charts/react.png)

| Parser | Mean | Min | Max | Peak Memory (RSS) |
|--------|------|-----|-----|----|
| Oxc | 1.15 ms | 0.49 ms | 18.04 ms | 2.1 MB |
| Yuku | 1.56 ms | 0.61 ms | 22.33 ms | 2.1 MB |
| SWC | 1.83 ms | 0.96 ms | 18.33 ms | 3.1 MB |
| Jam | Failed to parse | - | - | - |

## Semantic

The ECMAScript specification defines a set of early errors that conformant implementations must report before execution. Some of these are detectable during parsing from local context alone, like `return` outside a function, `yield` outside a generator, invalid destructuring, etc. Others require knowledge of the program's scope structure and bindings, such as redeclarations, unresolved exports, private fields used outside their class, etc.

Parsers handle this differently: SWC checks some scope-dependent errors during parsing itself, while Yuku and Oxc defer them entirely to a separate semantic analysis pass. This keeps parsing fast and lets each consumer opt in only to the work it actually needs. A formatter, for example, only needs the AST and should not pay the cost of scope resolution.

The benchmarks below measure parsing followed by this additional pass, which builds a scope tree and symbol table, resolves identifier references to their declarations, and reports the remaining early errors. Together, parsing and semantic analysis cover the full set of early errors required by the specification.

### [typescript.js](https://raw.githubusercontent.com/yuku-toolchain/parser-benchmark-files/refs/heads/main/typescript.js)

![typescript.js Semantic Performance](charts/typescript_semantic.png)

| Parser | Mean | Min | Max | Peak Memory (RSS) |
|--------|------|-----|-----|----|
| Yuku + Semantic | 43.39 ms | 39.29 ms | 54.84 ms | 186.8 MB |
| Oxc + Semantic | 66.56 ms | 60.35 ms | 103.65 ms | 186.8 MB |

### [three.js](https://raw.githubusercontent.com/yuku-toolchain/parser-benchmark-files/refs/heads/main/three.js)

![three.js Semantic Performance](charts/three_semantic.png)

| Parser | Mean | Min | Max | Peak Memory (RSS) |
|--------|------|-----|-----|----|
| Yuku + Semantic | 11.39 ms | 9.65 ms | 27.95 ms | 40.2 MB |
| Oxc + Semantic | 13.38 ms | 11.74 ms | 28.26 ms | 40.2 MB |

### [react.js](https://raw.githubusercontent.com/yuku-toolchain/parser-benchmark-files/refs/heads/main/react.js)

![react.js Semantic Performance](charts/react_semantic.png)

| Parser | Mean | Min | Max | Peak Memory (RSS) |
|--------|------|-----|-----|----|
| Oxc + Semantic | 1.46 ms | 0.88 ms | 17.97 ms | 3.1 MB |
| Yuku + Semantic | 1.48 ms | 0.69 ms | 15.58 ms | 3.1 MB |

## Run Benchmarks

### Prerequisites

- [Bun](https://bun.sh/) - JavaScript runtime and package manager
- [Rust](https://www.rust-lang.org/tools/install) - For building Rust-based parsers
- [Zig](https://ziglang.org/download/) - For building Zig-based parsers (requires nightly/development version)
- [Hyperfine](https://github.com/sharkdp/hyperfine) - Command-line benchmarking tool

### Steps

1. Clone the repository:

```bash
git clone https://github.com/yuku-toolchain/parser-benchmark-native.git
cd parser-benchmark-native
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
