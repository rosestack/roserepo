import React, {useMemo} from "react";

import {useLocation} from "react-router-dom";

import {AppShell, AppShellNavbar, ScrollArea, Tooltip, Center, UnstyledButton, ActionIcon} from "@mantine/core";

import {IconLayoutDashboard, IconSettings} from "@tabler/icons-react";

interface BarItem {
  icon: typeof IconLayoutDashboard;
  label: string;
  href: string;
}

const UpperBar: BarItem[] = [
  {
    icon: IconLayoutDashboard,
    label: "Overview",
    href: "/",
  },
];

const LowerBar: BarItem[] = [
  {
    icon: IconSettings,
    label: "Settings",
    href: "/settings",
  },
];

const NavbarItem = (props: BarItem & { active: boolean }) => {
  const [hover, setHover] = React.useState(false);

  const bgColor = useMemo(() => {
    if (hover) {
      return "dark.6";
    }

    if (props.active) {
      return "dark.7";
    }

    return "transparent";
  }, [hover, props.active]);

  return (
    <UnstyledButton component={ "a" } href={ props.href } onMouseOut={ () => setHover(false) } onMouseOver={ () => setHover(true) }>
      <Center bg={ bgColor } h={ 60 } w={ 60 }>
        <Tooltip label={ props.label } offset={ {mainAxis: 12} } position={ "right" } withArrow={ true }>
          <ActionIcon size={ "md" }>
            <props.icon style={ {width: "76%", height: "76%"} }/>
          </ActionIcon>
        </Tooltip>
      </Center>
    </UnstyledButton>
  );
};

const Navbar = () => {
  const location = useLocation();

  return (
    <AppShellNavbar bg={ "dark.8" }>
      <AppShell.Section component={ ScrollArea } grow={ true }>
        {
          UpperBar.map((item) => (
            <NavbarItem active={ location.pathname === item.href } key={ item.label } { ...item }/>
          ))
        }
      </AppShell.Section>
      <AppShell.Section>
        {
          LowerBar.map((item) => (
            <NavbarItem active={ location.pathname === item.href } key={ item.label } { ...item }/>
          ))
        }
      </AppShell.Section>
    </AppShellNavbar>
  );
};

export default Navbar;