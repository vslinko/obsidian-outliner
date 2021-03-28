import typescript from "@rollup/plugin-typescript";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";

export default (commandLineArgs) => ({
  input: commandLineArgs.configWithTests ? "test.ts" : "main.ts",
  output: {
    file: "main.js",
    sourcemap: "inline",
    format: "cjs",
    exports: "default",
  },
  external: ["obsidian"],
  plugins: [typescript(), nodeResolve({ browser: true }), commonjs()],
});
