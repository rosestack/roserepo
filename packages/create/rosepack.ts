import { defineRosepack } from "rosepack";

export default defineRosepack({
  defineVersion: true,
  entry: {
    bin: "lib/bin/index.ts",
  },
  output: {
    esm: {
      shims: true,
    },
  },
  clean: true,
});