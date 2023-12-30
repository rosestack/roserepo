import useSWR from "swr";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      API: string;
    }
  }
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const format = (url: string) => {
  return new URL(url, process.env.API).href;
};

interface Status {
  [key: string]: any;
}

const useStatus = () => {
  const {data, error, isLoading, isValidating} = useSWR<Status, unknown>(format("/"), fetcher, {
    refreshInterval: 1000,
  });

  return {
    data,
    error,
    isLoading,
    isValidating,
  };
};

interface Roserepo {
  cwd: string;
  name: string;
  children?: Roserepo[];
}

interface Tree {
  roserepo: Roserepo;
}

const useTree = () => {
  const {data, error, isLoading, isValidating} = useSWR<Tree, unknown>(format("/tree"), fetcher, {
    refreshInterval: undefined,
  });

  return {
    data,
    error,
    isLoading,
    isValidating,
  };
};

export {
  useStatus,
  useTree,
};