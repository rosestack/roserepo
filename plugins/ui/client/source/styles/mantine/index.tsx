"use client";

import React from "react";

import type { ColorScheme } from "@mantine/core";
import { MantineProvider, ColorSchemeProvider } from "@mantine/core";

import { useLocalStorage } from "@mantine/hooks";

import mantineTheme from "./theme";

interface Props {
  children: React.ReactNode;
}

const Mantine = (props: Props) => {
  const [ colorScheme, setColorScheme ] = useLocalStorage<ColorScheme>({
    key: "color-scheme",
    defaultValue: "dark",
    getInitialValueInEffect: true,
  });

  const toggleColorScheme = (value?: ColorScheme) => setColorScheme((value) || (colorScheme === "dark" ? "light" : "dark"));

  return (
    <ColorSchemeProvider colorScheme={ colorScheme } toggleColorScheme={ toggleColorScheme }>
      <MantineProvider theme={ mantineTheme(colorScheme) } withGlobalStyles={ true } withNormalizeCSS={ true }>
        {props.children}
      </MantineProvider>
    </ColorSchemeProvider>
  );
};

export default Mantine;