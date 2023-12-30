import {createBrowserRouter, RouterProvider, Outlet} from "react-router-dom";

import {AppShell, Center, Loader, Text, AppShellMain, Box} from "@mantine/core";

import {useStatus} from "~client/api";

import Header from "./components/header";
import Navbar from "./components/navbar";

import MainRoute from "./routes/main";

const router = createBrowserRouter([
  {
    element: (
      <AppShell header={ {height: 56} } navbar={ {width: 60, breakpoint: 0} } withBorder={ false }>
        <Header/>
        <Navbar/>
        <AppShellMain pos={ "relative" }>
          <Box inset={ 0 } pos={ "absolute" } style={ {padding: "inherit"} }>
            <Box h={ "100%" } p={ "md" } w={ "100%" }>
              <Outlet/>
            </Box>
          </Box>
        </AppShellMain>
      </AppShell>
    ),
    children: [
      {
        path: "/",
        element: (
          <MainRoute/>
        ),
      },
    ],
  },
]);

const App = () => {
  const status = useStatus();

  if (status.isLoading) {
    return (
      <Center h={ "100%" }>
        <Loader/>
      </Center>
    );
  }

  if (status.error) {
    let message;

    if (status.error instanceof Error) {
      message = status.error.message;
    } else {
      if (typeof status.error === "string") {
        message = status.error;
      } else {
        message = "An unknown error occurred";
      }
    }

    return (
      <Center h={ "100%" }>
        <Text>{message}</Text>
      </Center>
    );
  }

  return (
    <RouterProvider router={ router }/>
  );
};

export default App;