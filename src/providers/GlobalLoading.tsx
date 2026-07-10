"use client";

import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import LoadingState from "@/components/ui/state/Loading/LoadingState";

export default function GlobalLoading() {
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();

  const isLoading = isFetching > 0 || isMutating > 0;

  if (!isLoading) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#0f172a", // match UI của bạn
      }}
    >
      <LoadingState />
    </div>
  );
}