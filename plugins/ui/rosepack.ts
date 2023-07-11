import { defineRosepack } from "rosepack";

export default defineRosepack({
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
  declaration: true,
  clean: true,
});