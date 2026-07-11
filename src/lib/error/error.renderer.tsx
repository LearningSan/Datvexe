"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

import { mapError } from "./error.mapper";

import Error400 from "@/components/ui/state/Error400/Error400";
import Error404 from "@/components/ui/state/Error404/Error404";
import Error403 from "@/components/ui/state/Error403/Error403";
import Error500 from "@/components/ui/state/Error500/Error500";
import ErrorNetwork from "@/components/ui/state/ErrorNetwork/ErrorNetwork";

interface ErrorRendererProps {
  error: unknown;
  onRetry?: () => void;
}

export default function ErrorRenderer({ error, onRetry }: ErrorRendererProps) {
  const router = useRouter();

  const type = useMemo(() => {
    if (!error) return null;

    return mapError(error);
  }, [error]);

  useEffect(() => {
    if (type === "UNAUTHORIZED") {
      router.replace("/login");
    }
  }, [type, router]);

  if (!type || type === "UNAUTHORIZED") {
    return null;
  }

  switch (type) {
    case "BAD_REQUEST":
      return <Error400 />;

    case "NOT_FOUND":
      return <Error404 />;

    case "FORBIDDEN":
      return <Error403 />;

    case "NETWORK":
      return <ErrorNetwork />;

    case "SERVER_ERROR":
    case "UNKNOWN":
    default:
      return <Error500 onRetry={onRetry} />;
  }
}
