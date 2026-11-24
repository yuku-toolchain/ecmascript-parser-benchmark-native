use std::hint::black_box;
use std::time::Instant;

use oxc_allocator::Allocator;
use oxc_parser::Parser as OxcParser;
use oxc_semantic::SemanticBuilder;
use oxc_span::SourceType;

use swc_common::BytePos;
use swc_ecma_parser::{EsSyntax, Parser as SwcParser, StringInput, Syntax, TsSyntax};

#[global_allocator]
static GLOBAL: mimalloc::MiMalloc = mimalloc::MiMalloc;

const WARMUP: usize = 50;
const RUNS: usize = 300;

struct Stats {
    median: f64,
    min: f64,
    p99: f64,
}

fn measure(mut sample: impl FnMut() -> u64) -> Stats {
    for _ in 0..WARMUP {
        sample();
    }
    let mut secs: Vec<f64> = (0..RUNS).map(|_| sample() as f64 / 1e9).collect();
    secs.sort_by(|a, b| a.partial_cmp(b).unwrap());
    Stats {
        median: secs[RUNS / 2],
        min: secs[0],
        p99: secs[RUNS * 99 / 100],
    }
}

fn swc_syntax(path: &str) -> Syntax {
    if path.ends_with(".tsx") {
        Syntax::Typescript(TsSyntax { tsx: true, ..Default::default() })
    } else if path.ends_with(".ts") {
        Syntax::Typescript(TsSyntax::default())
    } else if path.ends_with(".jsx") {
        Syntax::Es(EsSyntax { jsx: true, ..Default::default() })
    } else {
        Syntax::Es(EsSyntax::default())
    }
}

fn bench_oxc(src: &str, st: SourceType) -> Stats {
    measure(|| {
        let allocator = Allocator::default();
        let start = Instant::now();
        let ret = OxcParser::new(&allocator, black_box(src), st).parse();
        let dt = start.elapsed().as_nanos() as u64;
        black_box(&ret);
        dt
    })
}

fn bench_oxc_semantic(src: &str, st: SourceType) -> Stats {
    measure(|| {
        let allocator = Allocator::default();
        let ret = OxcParser::new(&allocator, black_box(src), st).parse();
        let start = Instant::now();
        let sem = SemanticBuilder::new()
            .with_check_syntax_error(false)
            .build(black_box(&ret.program));
        let dt = start.elapsed().as_nanos() as u64;
        black_box(&sem);
        black_box(&ret);
        dt
    })
}

fn bench_swc(src: &str, syntax: Syntax) -> Stats {
    measure(|| {
        let input = StringInput::new(src, BytePos(0), BytePos(src.len() as u32));
        let start = Instant::now();
        let module = SwcParser::new(syntax, black_box(input), None).parse_module();
        let dt = start.elapsed().as_nanos() as u64;
        black_box(&module);
        dt
    })
}

fn main() {
    let mut out = String::from("{\"results\":[");
    let mut first = true;

    for path in std::env::args().skip(1) {
        let source = match std::fs::read_to_string(&path) {
            Ok(s) => s,
            Err(e) => {
                eprintln!("rust: cannot read {path}: {e}");
                continue;
            }
        };
        let st = SourceType::from_path(&path).unwrap();
        let cases = [
            ("oxc", bench_oxc(&source, st)),
            ("oxc_semantic", bench_oxc_semantic(&source, st)),
            ("swc", bench_swc(&source, swc_syntax(&path))),
        ];
        for (parser, s) in cases {
            if !first {
                out.push(',');
            }
            first = false;
            out.push_str(&format!(
                "{{\"parser\":\"{parser}\",\"file\":\"{path}\",\"median\":{},\"min\":{},\"p99\":{}}}",
                s.median, s.min, s.p99
            ));
        }
    }

    out.push_str("]}");
    println!("{out}");
}
