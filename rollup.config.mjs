import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import replace from "@rollup/plugin-replace";
import typescript from "@rollup/plugin-typescript";
import fs from "node:fs";

export default (commandLineArgs) => ({
  input: commandLineArgs.configWithTests
    ? "src/ObsidianOutlinerPluginWithTests.ts"
    : "src/ObsidianOutlinerPlugin.ts",
  output: {
    file: "dist/main.js",
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
  ],
  plugins: [
    replace({
      preventAssignment: true,
      PLUGIN_VERSION: JSON.stringify(
        JSON.parse(fs.readFileSync("./package.json", "utf-8")).version,
      ),
      CHANGELOG_MD: JSON.stringify(fs.readFileSync("./CHANGELOG.md", "utf-8")),
    }),
    typescript(),
    nodeResolve({ browser: true }),
    commonjs(),
  ],
});
