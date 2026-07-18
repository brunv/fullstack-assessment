// Learn more https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Native build output (Gradle/CMake for Android, Xcode/Pods for iOS) is never
// part of the JS bundle and must never be watched: CMake creates and deletes
// scratch directories (e.g. android/**/.cxx/**/CMakeTmp) within milliseconds
// while probing the NDK toolchain, and Metro's fallback watcher (used on
// Windows without Watchman) crashes with an unhandled ENOENT if it tries to
// `fs.watch` one that's already gone by the time it gets there.
const defaultBlockList = Array.isArray(config.resolver.blockList)
  ? config.resolver.blockList
  : config.resolver.blockList
    ? [config.resolver.blockList]
    : [];
config.resolver.blockList = [
  ...defaultBlockList,
  /apps\/mobile\/android\/.*/,
  /apps\/mobile\/ios\/.*/,
  // Native modules under node_modules (e.g. @nozbe/watermelondb) also build
  // in place and produce their own .cxx/CMakeTmp scratch dirs - exclude those
  // wherever they occur, not just under this app's own android/ios folders.
  /\.cxx\/.*/,
];

module.exports = config;
