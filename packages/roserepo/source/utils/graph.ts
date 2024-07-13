type Vertex<T> = {
  id: string;
  children: string[];
  data: T;
};

class Graph<T> {
  private vertices: Vertex<T>[] = [];

  addVertex = (vertex: Vertex<T>) => {
    this.vertices.push(vertex);
  };

  removeVertex = (id: string) => {
    this.vertices = this.vertices.filter((v) => v.id !== id);

    this.vertices.forEach((vertex) => {
      vertex.children = vertex.children.filter((childId) => childId !== id);
    });
  };

  findCyclic = () => {
    let isCyclic = false, cycleIds: string[] = [];
    const visited = new Set<string>();
    const stack = new Set<string>();

    const visit = (vertex: Vertex<T>) => {
      if (isCyclic) return;

      visited.add(vertex.id);
      stack.add(vertex.id);

      for (const childId of vertex.children) {
        const child = this.vertices.find((v) => v.id === childId);
        if (!child) continue;

        if (!visited.has(child.id)) {
          visit(child);
        } else if (stack.has(child.id)) {
          isCyclic = true;
          cycleIds = Array.from(stack).concat(child.id);
          return;
        }
      }

      stack.delete(vertex.id);
    };

    for (const vertex of this.vertices) {
      if (!visited.has(vertex.id)) {
        visit(vertex);
      }
    }

    return {
      isCyclic,
      cycleIds,
    };
  };

  findLowLevel = () => {
    return this.vertices.reduce<T[]>((items, vertex) => {
      if (vertex.children.length === 0) {
        items.push(vertex.data);
      }

      return items;
    }, []);
  };
}

export default Graph;
