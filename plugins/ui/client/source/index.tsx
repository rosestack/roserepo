import React from "react";
import ReactDOM from "react-dom/client";

import {MantineProvider} from "@mantine/core";

import App from "./app";

import {theme} from "./styles/mantine";

import "@mantine/core/styles.css";

import "./styles/main.scss";

const root = document.getElementById("root")!;

ReactDOM.createRoot(root).render((
  <React.StrictMode>
    <MantineProvider defaultColorScheme={ "dark" } theme={ theme }>
      <App/>
    </MantineProvider>
  </React.StrictMode>
));
