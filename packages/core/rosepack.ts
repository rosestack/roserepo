import { defineRosepack } from "rosepack";

export default defineRosepack({
  defineRuntime: {
    version: true,
  },
  entry: {
    bin: {
      input: "lib/bin/index.ts",
      format: [
        "esm",
      ],
    },
    roserepo: "lib/roserepo/index.ts",
  },
  output: {
    format: [
      "esm",
      "cjs",
    ],
    entryName: "[name].[format].js",
    chunkName: "[hash].[format].js",
    esm: {
      shims: true,
    },
  },
  declaration: {
    entry: "lib/roserepo/index.ts",
  },
  clean: true,
});