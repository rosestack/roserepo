import { Navbar as MantineNavbar, Text } from "@mantine/core";

const Navbar = () => {
  return (
    <MantineNavbar p={ "md" } width={ { base: 300 } }>
      <Text>Navbar</Text>
    </MantineNavbar>
  );
};

export default Navbar;