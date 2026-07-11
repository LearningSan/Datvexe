"use client";

import type { ReactNode } from "react";

import BlockSkeleton from "@/components/common/BlockSkeleton";
import BlockErrorState from "@/components/common/BlockErrorState";

interface BlockQueryStateProps {
  isPending: boolean;
  isError: boolean;
  hasData: boolean;

  children: ReactNode;

  height?: number;
  errorTitle?: string;
  errorMessage?: string;
  onRetry?: () => void;
}

export default function BlockQueryState({
  isPending,
  isError,
  hasData,
  children,
  height = 180,
  errorTitle,
  errorMessage,
  onRetry,
}: BlockQueryStateProps) {
  if (isPending && !hasData) {
    return <BlockSkeleton height={height} />;
  }

  // Chỉ block này hiển thị lỗi
  if (isError && !hasData) {
    return (
      <BlockErrorState
        height={height}
        title={errorTitle}
        message={errorMessage}
        onRetry={onRetry}
      />
    );
  }
  return <>{children}</>;
}
