import {Group, Text, AppShellHeader} from "@mantine/core";

const Header = () => {
  return (
    <AppShellHeader bg={ "dark.8" } pr={ "md" }>
      <Group justify={ "space-between" } px={ 20 } style={ {height: "100%"} }>
        <Text>Roserepo Ui</Text>
      </Group>
    </AppShellHeader>
  );
};

export default Header;