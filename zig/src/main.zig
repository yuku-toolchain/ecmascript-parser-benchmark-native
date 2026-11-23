const std = @import("std");
const parser = @import("yuku_parser");

const warmup_runs = 50;
const measured_runs = 300;

const Case = enum { parse, semantic };

const Stats = struct { median: f64, min: f64, p99: f64 };

fn nsToS(ns: u64) f64 {
    return @as(f64, @floatFromInt(ns)) / std.time.ns_per_s;
}

fn bench(io: std.Io, comptime case: Case, source: []const u8, path: []const u8) !Stats {
    const opts: parser.Options = .{
        .lang = .fromPath(path),
        .source_type = .fromPath(path),
    };

    var gpa = std.heap.ArenaAllocator.init(std.heap.smp_allocator);
    defer gpa.deinit();

    for (0..warmup_runs) |_| {
        var tree = try parser.parse(gpa.allocator(), source, opts);
        if (case == .semantic) _ = try parser.semantic.analyze(&tree, .{ .check = true });
        std.mem.doNotOptimizeAway(tree.nodes.len);
        tree.deinit();
        _ = gpa.reset(.retain_capacity);
    }

    var samples: [measured_runs]u64 = undefined;
    for (&samples) |*sample| {
        const start = std.Io.Clock.now(.awake, io);
        var tree = try parser.parse(gpa.allocator(), source, opts);
        if (case == .semantic) _ = try parser.semantic.analyze(&tree, .{ .check = true });
        const end = std.Io.Clock.now(.awake, io);

        std.mem.doNotOptimizeAway(tree.nodes.len);
        tree.deinit();
        _ = gpa.reset(.retain_capacity);
        sample.* = @intCast(start.durationTo(end).toNanoseconds());
    }

    std.mem.sort(u64, &samples, {}, std.sort.asc(u64));
    return .{
        .median = nsToS(samples[measured_runs / 2]),
        .min = nsToS(samples[0]),
        .p99 = nsToS(samples[(measured_runs * 99) / 100]),
    };
}

pub fn main(init: std.process.Init) !void {
    const io = init.io;
    const gpa = init.gpa;

    const cases = [_]struct { name: []const u8, case: Case }{
        .{ .name = "yuku", .case = .parse },
        .{ .name = "yuku_semantic", .case = .semantic },
    };

    var json: std.ArrayList(u8) = .empty;
    defer json.deinit(gpa);
    try json.appendSlice(gpa, "{\"results\":[");

    var first = true;
    var args = init.minimal.args.iterate();
    _ = args.skip();
    while (args.next()) |path| {
        const source = std.Io.Dir.cwd().readFileAlloc(io, path, gpa, .unlimited) catch |e| {
            std.debug.print("zig: cannot read {s}: {s}\n", .{ path, @errorName(e) });
            continue;
        };
        defer gpa.free(source);

        inline for (cases) |c| {
            const s = try bench(io, c.case, source, path);
            if (!first) try json.appendSlice(gpa, ",");
            first = false;
            const obj = try std.fmt.allocPrint(
                gpa,
                "{{\"parser\":\"{s}\",\"file\":\"{s}\",\"median\":{d},\"min\":{d},\"p99\":{d}}}",
                .{ c.name, path, s.median, s.min, s.p99 },
            );
            defer gpa.free(obj);
            try json.appendSlice(gpa, obj);
        }
    }

    try json.appendSlice(gpa, "]}\n");
    try std.Io.File.stdout().writeStreamingAll(io, json.items);
}
