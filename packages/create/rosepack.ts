import {defineRosepack} from "rosepack";

export default defineRosepack((config) => ({
  clean: config.mode === "production",
  defineRuntime: {
    version: true,
  },
  format: "esm",
  input: {
    bin: "source/index.ts",
  },
}));