import type { MantineThemeOverride, ColorScheme } from "@mantine/core";

const mantineTheme = (colorScheme: ColorScheme): MantineThemeOverride => ({
  colorScheme,
  primaryColor: "indigo",
  globalStyles: () => ({
    "*, *::before, *::after": {
      boxSizing: "border-box",
      userSelect: "none",
      margin: 0,
      padding: 0,
    },
    body: {
      position: "relative",
      height: "100vh",
      ["#root"]: {
        height: "100vh",
      },
    },
  }),
});

export default mantineTheme;