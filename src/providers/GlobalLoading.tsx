"use client";

import { useIsFetching } from "@tanstack/react-query";

import LoadingState from "@/components/ui/state/Loading/LoadingState";

export default function GlobalLoading() {
  const initialFetchingCount = useIsFetching({
    predicate: (query) => {
      if (query.meta?.globalLoading === false) {
        return false;
      }
      return query.state.data === undefined;
    },
  });

  if (initialFetchingCount === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#0f172a",
      }}
    >
      <LoadingState />
    </div>
  );
}
