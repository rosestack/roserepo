"use client";

import {createTheme, Center, DefaultMantineColor, MantineColorsTuple} from "@mantine/core";

type ExtendedCustomColors = "primary" | DefaultMantineColor;

declare module "@mantine/core" {
  export interface MantineThemeColorsOverride {
    colors: Record<ExtendedCustomColors, MantineColorsTuple>;
  }
}

const theme: any = createTheme({
  primaryColor: "primary",
  primaryShade: 6,
  colors: {
    primary: [
      "#ffedef",
      "#f7dadf",
      "#e7b4bd",
      "#d88b98",
      "#cb6979",
      "#c45365",
      "#bf4055",
      "#ab384c",
      "#9a3042",
      "#882538",
    ],
  },
  components: {
    Center: Center.extend({
      styles: {
        root: {
          height: "100%",
        },
      },
    }),
  },
  defaultRadius: "sm",
  focusRing: "auto",
});

export {
  theme,
};