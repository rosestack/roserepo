import React from "react";
import ReactDOM from "react-dom/client";

import Mantine from "./styles/mantine";

import App from "./app";

const root = document.getElementById("root")!;

ReactDOM.createRoot(root).render((
  <React.StrictMode>
    <Mantine>
      <App/>
    </Mantine>
  </React.StrictMode>
));
