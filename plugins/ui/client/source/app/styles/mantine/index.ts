import type { MantineThemeOverride, ColorScheme } from "@mantine/core";

const mantineTheme = (colorScheme: ColorScheme): MantineThemeOverride => ({
  colorScheme,
  globalStyles: () => ({
    "*, *::before, *::after": {
      boxSizing: "border-box",
      userSelect: "none",
      margin: 0,
      padding: 0,
    },
    body: {
      position: "relative",
      minHeight: "100vh",
    },
  }),
});

export default mantineTheme;