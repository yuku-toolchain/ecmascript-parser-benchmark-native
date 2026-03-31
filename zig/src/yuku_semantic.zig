const std = @import("std");
const yuku_parser = @import("yuku_parser");

const source = @embedFile("source");

pub fn main(_: std.process.Init) !void {
    var tree = try yuku_parser.parse(std.heap.page_allocator, source, .{
        .lang = comptime .fromPath("bench.js"),
        .source_type = comptime .fromPath("bench.js"),
    });
    defer tree.deinit();

    _ = try yuku_parser.semantic.analyze(&tree);
}
