import { MutationCache, QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { logClientError } from "./lib/client-errors";

export const getRouter = () => {
  const queryClient = new QueryClient({
    // Every failed mutation is reported, on top of whatever the call site does
    // with it. Individual onError handlers still run — this doesn't replace them.
    mutationCache: new MutationCache({
      onError: (error) => logClientError(error, "mutation"),
    }),
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
