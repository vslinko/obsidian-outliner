import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";

export default (commandLineArgs) => ({
  input: commandLineArgs.configWithTests
    ? "src/ObsidianOutlinerPluginWithTests.ts"
    : "src/ObsidianOutlinerPlugin.ts",
  output: {
    file: "main.js",
    sourcemap: "inline",
    format: "cjs",
    exports: "default",
  },
  external: [
    "obsidian",
    "codemirror",
    "@codemirror/state",
    "@codemirror/view",
    "@codemirror/language",
    "@codemirror/fold",
  ],
  plugins: [typescript(), nodeResolve({ browser: true }), commonjs()],
});
