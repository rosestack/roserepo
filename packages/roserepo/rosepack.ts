import {defineRosepack} from "rosepack";

export default defineRosepack(() => ({
  format: [
    "dts",
    "esm",
  ],
  input: {
    bin: {
      input: "source/bin.ts",
      format: "esm",
    },
    main: "source/main.ts",
  },
}));
