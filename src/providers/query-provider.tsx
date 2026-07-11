"use client";

import { ReactNode, useState } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export default function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            throwOnError: false,

            retry: (failureCount, error: any) => {
              const status = error?.response?.status;

              if (
                status === 400 ||
                status === 401 ||
                status === 403 ||
                status === 404 ||
                status === 422
              ) {
                return false;
              }

              return failureCount < 2;
            },

            retryDelay: (attemptIndex) =>
              Math.min(1000 * 2 ** attemptIndex, 5000),

            refetchOnWindowFocus: false,
            refetchOnReconnect: true,

            staleTime: 1000 * 60 * 5,
            gcTime: 1000 * 60 * 30,
          },

          mutations: {
            throwOnError: false,
            retry: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
