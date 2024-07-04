module.exports = {
  plugins: [require.resolve("@trivago/prettier-plugin-sort-imports")],
  importOrder: [
    "^obsidian$",
    "^@codemirror/.*$",
    "<THIRD_PARTY_MODULES>",
    "^\\./",
    "^\\.\\./",
  ],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
  // https://github.com/trivago/prettier-plugin-sort-imports/issues/113
  overrides: [
    {
      files: "*.ts",
      options: {
        importOrderParserPlugins: ["typescript"],
      },
    },
  ],
};
