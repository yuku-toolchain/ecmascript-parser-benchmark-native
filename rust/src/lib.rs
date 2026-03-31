use oxc_allocator::Allocator;
use oxc_parser::Parser;
use oxc_semantic::SemanticBuilder;
use oxc_span::SourceType;

pub fn parse_with_oxc(source: &str) {
    let source_type = SourceType::from_path("bench.js").unwrap();
    let allocator = Allocator::default();
    let _ = Parser::new(&allocator, source, source_type).parse();
}

pub fn parse_and_analyze_with_oxc(source: &str) {
    let source_type = SourceType::from_path("bench.js").unwrap();
    let allocator = Allocator::default();
    let ret = Parser::new(&allocator, source, source_type).parse();
    let _ = SemanticBuilder::new().with_check_syntax_error(true).build(&ret.program);
}

pub fn parse_with_swc(source: &str) {
    use swc_common::BytePos;
    use swc_ecma_parser::{EsSyntax, Parser, StringInput, Syntax};

    let syntax = Syntax::Es(EsSyntax::default());
    let input = StringInput::new(source, BytePos(0), BytePos(source.len() as u32));
    let _ = Parser::new(syntax, input, None).parse_module().unwrap();
}
