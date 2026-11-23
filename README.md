# Native ECMAScript Parser Benchmark

Benchmarks for ECMAScript parsers compiled to native binaries (Zig, Rust), measuring raw parsing speed without any JavaScript runtime overhead.

## System

| Property | Value |
|----------|-------|
| OS | macOS 25.6.0 (arm64) |
| CPU | Apple M3 |
| Cores | 8 |
| Memory | 16 GB |

## Parsers

### [Yuku](https://github.com/yuku-toolchain/yuku)

**Language:** Zig

A high-performance & spec-compliant JavaScript/TypeScript compiler toolchain written in Zig.

### [Oxc](https://github.com/oxc-project/oxc)

**Language:** Rust

A high-performance JavaScript and TypeScript parser written in Rust.

### [SWC](https://github.com/swc-project/swc)

**Language:** Rust

An extensible Rust-based platform for compiling and bundling JavaScript and TypeScript.

### [SWC Next](https://github.com/swc-project/swc-next)

**Language:** Rust

The next-generation SWC JavaScript and TypeScript parser.

## Benchmarks

### [typescript.js](https://raw.githubusercontent.com/yuku-toolchain/parser-benchmark-files/refs/heads/main/typescript.js)

**File size:** 7.83 MB

![Bar chart comparing native parser speeds for typescript.js](charts/typescript.svg)

| Parser | Median | Min | p99 | Relative |
|--------|--------|-----|-----|----------|
| Yuku | 12.88 ms | 12.60 ms | 13.85 ms | 1.00× |
| SWC Next | 14.09 ms | 14.05 ms | 14.37 ms | 1.09× |
| Oxc | 19.24 ms | 19.15 ms | 21.11 ms | 1.49× |
| SWC | 36.34 ms | 35.90 ms | 39.44 ms | 2.82× |

### [checker.ts](https://raw.githubusercontent.com/yuku-toolchain/parser-benchmark-files/refs/heads/main/checker.ts)

**File size:** 2.95 MB

![Bar chart comparing native parser speeds for checker.ts](charts/checker.svg)

| Parser | Median | Min | p99 | Relative |
|--------|--------|-----|-----|----------|
| Yuku | 4.12 ms | 3.92 ms | 4.36 ms | 1.00× |
| SWC Next | 4.87 ms | 4.83 ms | 5.15 ms | 1.18× |
| Oxc | 6.13 ms | 6.10 ms | 6.70 ms | 1.49× |
| SWC | 11.54 ms | 11.41 ms | 12.05 ms | 2.80× |

### [lib.dom.d.ts](https://raw.githubusercontent.com/yuku-toolchain/parser-benchmark-files/refs/heads/main/lib.dom.d.ts)

**File size:** 2.24 MB

![Bar chart comparing native parser speeds for lib.dom.d.ts](charts/lib_dom.svg)

| Parser | Median | Min | p99 | Relative |
|--------|--------|-----|-----|----------|
| Yuku | 1.44 ms | 1.43 ms | 1.54 ms | 1.00× |
| SWC Next | 1.58 ms | 1.55 ms | 1.75 ms | 1.10× |
| Oxc | 2.01 ms | 2.00 ms | 2.07 ms | 1.40× |
| SWC | 3.87 ms | 3.81 ms | 4.01 ms | 2.69× |

### [react.js](https://raw.githubusercontent.com/yuku-toolchain/parser-benchmark-files/refs/heads/main/react.js)

**File size:** 0.07 MB

![Bar chart comparing native parser speeds for react.js](charts/react.svg)

| Parser | Median | Min | p99 | Relative |
|--------|--------|-----|-----|----------|
| Yuku | 0.07 ms | 0.07 ms | 0.08 ms | 1.00× |
| SWC Next | 0.07 ms | 0.07 ms | 0.08 ms | 1.06× |
| Oxc | 0.11 ms | 0.11 ms | 0.14 ms | 1.64× |
| SWC | 0.25 ms | 0.23 ms | 0.27 ms | 3.65× |

## Semantic

The ECMAScript specification defines a set of early errors that conformant implementations must report before execution. Some of these are detectable during parsing from local context alone, like `return` outside a function, `yield` outside a generator, invalid destructuring, etc. Others require knowledge of the program's scope structure and bindings, such as redeclarations, unresolved exports, private fields used outside their class, etc.

Parsers handle this differently: SWC checks some scope-dependent errors during parsing itself, while Yuku, Oxc, and SWC Next provide a separate semantic analysis pass. This keeps parsing fast and lets each consumer opt in only to the work it actually needs. A formatter, for example, only needs the AST and should not pay the cost of scope resolution.

The benchmarks below measure parsing followed by this additional pass, which builds a scope tree and symbol table, resolves identifier references to their declarations, and reports the remaining early errors. SWC Next enables `SyntaxChecks::all()`; Yuku enables `check = true`. These timings do not establish equivalent conformance coverage.

### [typescript.js](https://raw.githubusercontent.com/yuku-toolchain/parser-benchmark-files/refs/heads/main/typescript.js)

![Bar chart comparing parser speeds with semantic analysis for typescript.js](charts/typescript_semantic.svg)

| Parser | Median | Min | p99 | Relative |
|--------|--------|-----|-----|----------|
| Yuku + Semantic | 27.69 ms | 27.20 ms | 28.84 ms | 1.00× |
| SWC Next + Semantic | 29.76 ms | 29.60 ms | 31.36 ms | 1.07× |
| Oxc + Semantic | 37.79 ms | 37.48 ms | 39.41 ms | 1.36× |

### [checker.ts](https://raw.githubusercontent.com/yuku-toolchain/parser-benchmark-files/refs/heads/main/checker.ts)

![Bar chart comparing parser speeds with semantic analysis for checker.ts](charts/checker_semantic.svg)

| Parser | Median | Min | p99 | Relative |
|--------|--------|-----|-----|----------|
| Yuku + Semantic | 9.95 ms | 9.87 ms | 10.09 ms | 1.00× |
| SWC Next + Semantic | 10.99 ms | 10.93 ms | 14.92 ms | 1.11× |
| Oxc + Semantic | 12.95 ms | 12.92 ms | 13.40 ms | 1.30× |

### [lib.dom.d.ts](https://raw.githubusercontent.com/yuku-toolchain/parser-benchmark-files/refs/heads/main/lib.dom.d.ts)

![Bar chart comparing parser speeds with semantic analysis for lib.dom.d.ts](charts/lib_dom_semantic.svg)

| Parser | Median | Min | p99 | Relative |
|--------|--------|-----|-----|----------|
| Yuku + Semantic | 2.66 ms | 2.64 ms | 2.80 ms | 1.00× |
| SWC Next + Semantic | 2.99 ms | 2.97 ms | 3.23 ms | 1.12× |
| Oxc + Semantic | 3.49 ms | 3.48 ms | 3.52 ms | 1.31× |

### [react.js](https://raw.githubusercontent.com/yuku-toolchain/parser-benchmark-files/refs/heads/main/react.js)

![Bar chart comparing parser speeds with semantic analysis for react.js](charts/react_semantic.svg)

| Parser | Median | Min | p99 | Relative |
|--------|--------|-----|-----|----------|
| Yuku + Semantic | 0.14 ms | 0.14 ms | 0.15 ms | 1.00× |
| SWC Next + Semantic | 0.15 ms | 0.15 ms | 0.16 ms | 1.04× |
| Oxc + Semantic | 0.23 ms | 0.23 ms | 0.28 ms | 1.63× |

## Run Benchmarks

### Prerequisites

- [Bun](https://bun.sh/) - JavaScript runtime and package manager
- [Rust](https://www.rust-lang.org/tools/install) - For building Rust-based parsers
- [Zig](https://ziglang.org/download/) 0.17.0 - Required by Yuku 0.27.0

### Steps

1. Clone the repository:

```bash
git clone https://github.com/yuku-toolchain/ecmascript-parser-benchmark-native.git
cd ecmascript-parser-benchmark-native
```

2. Install dependencies:

```bash
bun install
```

3. Download the benchmark files:

```bash
bun load-files
```

4. Build the parsers:

```bash
bun run build
```

5. Run benchmarks:

```bash
bun bench
```

This will run benchmarks on all test files. Results are saved to the `result/` directory.

## Methodology

Parsing is timed in-process to isolate it from process startup, dynamic linking, file I/O, and memory teardown, which would otherwise dominate the measurement on smaller files.

The source is read once, then each parser runs 50 warmup iterations followed by 300 timed iterations. A monotonic clock wraps only the parse call (plus the semantic pass for the semantic variants); allocation and teardown happen outside the timed region, and the result passes through an optimization barrier so the work cannot be elided. Reported figures are the median, minimum, and 99th percentile of the timed runs.

Binaries are built with release optimizations: Rust with `cargo build --release` (LTO, single codegen unit, symbol stripping) and Zig with `zig build --release=fast`. Each uses a fast general-purpose allocator (Rust `mimalloc`, Zig `smp_allocator`).