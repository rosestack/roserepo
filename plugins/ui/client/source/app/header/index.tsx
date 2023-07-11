import { Header as MantineHeader, useMantineColorScheme, Group, ActionIcon, Text } from "@mantine/core";

import { CiDark, CiLight } from "react-icons/ci";

const Header = () => {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();

  return (
    <MantineHeader height={ 60 }>
      <Group position={ "apart" } px={ 20 } sx={ { height: "100%" } }>
        <Text>Roserepo Ui</Text>
        <ActionIcon size={ 30 } variant={ "default" } onClick={ () => toggleColorScheme() }>
          {colorScheme === "dark" ? <CiLight size={ "1rem" }/> : <CiDark size={ "1rem" }/>}
        </ActionIcon>
      </Group>
    </MantineHeader>
  );
};

export default Header;