import { useMemo } from "react";

import { AppShell, Center, Loader } from "@mantine/core";

import { useStatus } from "~client/api";

import Header from "./header";
import Navbar from "./navbar";
import Main from "./main";

const App = () => {
  const status = useStatus();

  const memorizedHeader = useMemo(() => <Header/>, []);
  const memorizedNavbar = useMemo(() => <Navbar/>, []);
  const memorizedMain = useMemo(() => <Main/>, []);

  if ( status.isLoading ) {
    return (
      <Center h={ "100%" }>
        <Loader/>
      </Center>
    );
  }

  if ( status.error ) {
    let message;

    if ( status.error instanceof Error ) {
      message = status.error.message;
    } else {
      if ( typeof status.error === "string" ) {
        message = status.error;
      } else {
        message = "An unknown error occurred";
      }
    }

    return (
      <Center h={ "100%" }>
        <div>{message}</div>
      </Center>
    );
  }

  return (
    <AppShell
      children={ memorizedMain }
      header={ memorizedHeader }
      navbar={ memorizedNavbar }
      padding={ "md" }
    />
  );
};

export default App;