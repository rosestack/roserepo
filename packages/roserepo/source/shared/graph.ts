const findLastIndex = <T>(array: T[], predicate: (item: T, index: number) => boolean): number => {
  const founds: number[] = [];

  array.forEach((item, index) => {
    if ( predicate(item, index) ) {
      founds.push(index);
    }
  });

  return founds.length === 0 ? -1 : founds[founds.length - 1] as number;
};
const findFirstIndex = <T>(array: T[], predicate: (item: T, index: number) => boolean): number => {
  return array.findIndex(predicate);
};

type VertexId = string | number;

type Vertex<T> = {
  id: VertexId;
  edges: VertexId[];
  data: T;
};

class Graph<T> {
  private vertices: Vertex<T>[] = [];

  private * getAdjacencyVertices(): Generator<[ Vertex<T>, Vertex<T> ]> {
    for ( const vertex of this.vertices ) {
      for ( const edgesId of vertex.edges ) {
        const adjacentVertex = this.vertices.find((vertex) => {
          return vertex.id === edgesId;
        });

        if ( !adjacentVertex ) {
          continue;
        }

        yield [ vertex, adjacentVertex ];
      }
    }
  }

  //

  private * getDeepVertices(deep: "parents" | "children", vertex: Vertex<T>, deepVertex: Vertex<T>, alreadyVisited: VertexId[] = []): Generator<VertexId> {
    if ( alreadyVisited.includes(deepVertex.id) ) {
      return;
    }

    alreadyVisited.push(deepVertex.id);
    yield deepVertex.id;

    if ( vertex.id === deepVertex.id ) {
      return;
    }

    let nextDependencies: VertexId[];

    if ( deep === "children" ) {
      nextDependencies = deepVertex.edges;
    } else {
      nextDependencies = this.getParents(deepVertex.id).map((parent) => {
        return parent.id;
      });
    }

    for ( const nextDependencyId of nextDependencies ) {
      const nextDependencyVertex = this.vertices.find((vertex) => {
        return vertex.id === nextDependencyId;
      });

      if ( !nextDependencyVertex ) {
        continue;
      }

      yield * this.getDeepVertices(deep, vertex, nextDependencyVertex, alreadyVisited);
    }
  }

  addVertex(vertex: Vertex<T>): void {
    this.vertices.push(vertex);
  }

  //

  getParents(id: VertexId): Vertex<T>[] {
    return this.vertices.filter((vertex) => {
      return vertex.edges.includes(id);
    });
  }

  * getDeepParents(id: VertexId): Generator<Vertex<T>> {
    const parents = this.getParents(id);

    for ( const parent of parents ) {
      yield parent;

      yield * this.getDeepParents(parent.id);
    }
  }

  getChildren(id: VertexId): Vertex<T>[] {
    const parentVertex = this.vertices.find((vertex) => {
      return vertex.id === id;
    });

    if ( !parentVertex?.edges.length ) {
      return [];
    }

    return this.vertices.filter((vertex) => {
      return parentVertex.edges.includes(vertex.id);
    });
  }

  //

  * getDeepChildren(id: VertexId): Generator<Vertex<T>> {
    const children = this.getChildren(id);

    for ( const child of children ) {
      yield child;

      yield * this.getDeepChildren(child.id);
    }
  }

  findCyclic(): [ boolean, Vertex<T>[] ] {
    let isCyclic = false, cycleIds: VertexId[] = [];

    for ( const [ vertex, adjacentVertex ] of this.getAdjacencyVertices() ) {
      if ( isCyclic ) {
        break;
      }

      const adjacencyList = new Set<VertexId>();

      const deepVertices = this.getDeepVertices("children", vertex, adjacentVertex);

      for ( const deepVertex of deepVertices ) {
        adjacencyList.add(deepVertex);

        if ( deepVertex === vertex.id || adjacencyList.has(vertex.id) ) {
          isCyclic = true;

          cycleIds = [
            vertex.id,
            ...adjacencyList,
          ];

          break;
        }
      }
    }

    const cycleVertices: Vertex<T>[] = [];

    if ( isCyclic ) {
      cycleIds.forEach((id) => {
        const vertex = this.vertices.find((vertex) => {
          return vertex.id === id;
        });

        if ( vertex ) {
          cycleVertices.push(vertex);
        }
      });
    }

    return [ isCyclic, cycleVertices ];
  }

  //

  topological2dSort(): Vertex<T>[][] {
    const sort: Vertex<T>[][] = [];

    Array.from(this.vertices.values()).forEach((vertex) => {
      if ( sort.length === 0 ) {
        return sort.push([vertex]);
      }

      const parentsIds = Array.from(this.getDeepParents(vertex.id)).map((parent) => {
        return parent.id;
      });
      const childrenIds = Array.from(this.getDeepChildren(vertex.id)).map((child) => {
        return child.id;
      });

      const parentIndex = findFirstIndex(sort, (vertices) => {
        return vertices.some((vertex) => {
          return parentsIds.includes(vertex.id);
        });
      });
      const childIndex = findLastIndex(sort, (vertices) => {
        return vertices.some((vertex) => {
          return childrenIds.includes(vertex.id);
        });
      });

      if ( parentIndex === -1 && childIndex === -1 ) {
        return sort?.[0]?.push(vertex);
      }

      if ( parentIndex !== -1 && childIndex !== -1 ) {
        if ( parentIndex === childIndex + 1 ) {
          return sort.splice(parentIndex, 0, [vertex]);
        }

        return sort?.[childIndex + 1]?.push(vertex);
      }

      if ( parentIndex === -1 && childIndex !== -1 ) {
        if ( childIndex === sort.length - 1 ) {
          return sort.push([vertex]);
        }

        return sort?.[childIndex + 1]?.push(vertex);
      }

      if ( parentIndex !== -1 && childIndex === -1 ) {
        if ( parentIndex === 0 ) {
          return sort.unshift([vertex]);
        }

        return sort?.[parentIndex - 1]?.push(vertex);
      }

      return sort.push([vertex]);
    });

    return sort;
  }

  //

  topologicalSort(): Vertex<T>[] {
    const sort: Vertex<T>[] = [];

    Array.from(this.vertices).forEach((vertex) => {
      if ( sort.length === 0 ) {
        return sort.push(vertex);
      }

      const parentsIds = Array.from(this.getDeepParents(vertex.id)).map((parent) => {
        return parent.id;
      });
      const childrenIds = Array.from(this.getDeepChildren(vertex.id)).map((child) => {
        return child.id;
      });

      const parentIndex = findFirstIndex(sort, (vertex) => {
        return parentsIds.includes(vertex.id);
      });
      const childIndex = findLastIndex(sort, (vertex) => {
        return childrenIds.includes(vertex.id);
      });

      if ( parentIndex === -1 && childIndex === -1 ) {
        return sort.push(vertex);
      }

      if ( parentIndex !== -1 && childIndex !== -1 ) {
        return sort.splice(parentIndex, 0, vertex);
      }

      if ( parentIndex === -1 && childIndex !== -1 ) {
        return sort.splice(childIndex + 1, 0, vertex);
      }

      if ( parentIndex !== -1 && childIndex === -1 ) {
        return sort.splice(parentIndex, 0, vertex);
      }

      return sort.push(vertex);
    });

    return sort;
  }
}

export default Graph;