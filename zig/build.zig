const std = @import("std");

const files = .{
    .{ .name = "typescript", .path = "../files/typescript.js" },
    .{ .name = "three", .path = "../files/three.js" },
    .{ .name = "antd", .path = "../files/antd.js" },
};

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});

    const yuku_dep = b.dependency("yuku", .{
        .target = target,
        .optimize = optimize,
    });

    const jam_dep = b.dependency("jam", .{
        .target = target,
        .optimize = optimize,
    });

    const yuku_parser = yuku_dep.module("parser");
    const jam = jam_dep.module("js");

    inline for (files) |file| {
        const yuku_exe = b.addExecutable(.{
            .name = "yuku_" ++ file.name,
            .root_module = b.createModule(.{
                .root_source_file = b.path("src/yuku.zig"),
                .target = target,
                .optimize = optimize,
            }),
        });
        yuku_exe.root_module.addImport("yuku_parser", yuku_parser);
        yuku_exe.root_module.addAnonymousImport("source", .{
            .root_source_file = b.path(file.path),
        });
        b.installArtifact(yuku_exe);

        const yuku_semantic_exe = b.addExecutable(.{
            .name = "yuku_semantic_" ++ file.name,
            .root_module = b.createModule(.{
                .root_source_file = b.path("src/yuku_semantic.zig"),
                .target = target,
                .optimize = optimize,
            }),
        });
        yuku_semantic_exe.root_module.addImport("yuku_parser", yuku_parser);
        yuku_semantic_exe.root_module.addAnonymousImport("source", .{
            .root_source_file = b.path(file.path),
        });
        b.installArtifact(yuku_semantic_exe);

        const jam_exe = b.addExecutable(.{
            .name = "jam_" ++ file.name,
            .root_module = b.createModule(.{
                .root_source_file = b.path("src/jam.zig"),
                .target = target,
                .optimize = optimize,
            }),
        });
        jam_exe.root_module.addImport("jam", jam);
        jam_exe.root_module.addAnonymousImport("source", .{
            .root_source_file = b.path(file.path),
        });
        b.installArtifact(jam_exe);
    }
}
