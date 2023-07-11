import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const format = (url: string) => {
  return new URL(url, process.env.API).href;
};

interface Status {
  [key: string]: any;
}

const useStatus = () => {
  const { data, error, isLoading, isValidating } = useSWR<Status, unknown>(format("/"), fetcher, {
    refreshInterval: 1000,
  });

  return {
    data,
    error,
    isLoading,
    isValidating,
  };
};

const useRoserepo = () => {
  const { data, error, isLoading } = useSWR(format("/roserepo"), fetcher);

  return {
    data,
    error,
    isLoading,
  };
};

export {
  useStatus,
  useRoserepo,
};