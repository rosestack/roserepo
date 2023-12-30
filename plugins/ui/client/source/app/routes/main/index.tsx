import React from "react";

import {Box, Center, Loader} from "@mantine/core";

import Tree, {RawNodeDatum, Point} from "react-d3-tree";

import {useTree} from "~client/api";

import "./style.scss";

const MainRoute = () => {
  const tree = useTree();

  const [translate, setTranslate] = React.useState<Point>({
    x: 0,
    y: 0,
  });

  const parentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (parentRef.current) {
      const {width} = parentRef.current.getBoundingClientRect();

      setTranslate({
        x: width / 2,
        y: 56,
      });
    }
  }, [tree.isLoading]);

  if (tree.isLoading) {
    return (
      <Center>
        <Loader/>
      </Center>
    );
  }

  if (tree.error) {
    console.log(tree.error);

    return (
      <Center>
        <p>Something went wrong...</p>
      </Center>
    );
  }

  if (!tree.data) {
    return (
      <Center>
        <p>No data</p>
      </Center>
    );
  }

  const roserepo = tree.data.roserepo;

  const transformRoserepoToRawNodeDatum = (roserepo: any): RawNodeDatum => {
    return {
      name: roserepo.name,
      children: roserepo.children?.map(transformRoserepoToRawNodeDatum),
    };
  };

  const data: RawNodeDatum = transformRoserepoToRawNodeDatum(roserepo);

  return (
    <Box h={ "100%" } ref={ parentRef } w={ "100%" }>
      {
        translate.x === 0 && translate.y === 0 ? (
          <Center>
            <Loader/>
          </Center>
        ) : (
          <Tree
            data={ data }
            orientation={ "vertical" }
            translate={ translate }
            separation={
              {
                siblings: 2,
                nonSiblings: 2,
              }
            }
          />
        )
      }
    </Box>
  );
};

export default MainRoute;