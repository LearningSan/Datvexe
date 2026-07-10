"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

import { mapError } from "./error.mapper";

import Error401 from "@/components/ui/state/Error401/Error401";
import Error404 from "@/components/ui/state/Error404/Error404";
import Error403 from "@/components/ui/state/Error403/Error403";
import Error500 from "@/components/ui/state/Error500/Error500";
import ErrorNetwork from "@/components/ui/state/ErrorNetwork/ErrorNetwork";

export default function ErrorRenderer({
  error,
  onRetry,
}: {
  error: any;
  onRetry?: () => void;
}) {
  const router = useRouter();

  // 1. derive error type an toàn
  const type = useMemo(() => {
    if (!error) return null;
    return mapError(error);
  }, [error]);

  console.log("ERROR RAW:", error);

  // 2. redirect UNAUTHORIZED
  useEffect(() => {
    if (type === "UNAUTHORIZED") {
      router.replace("/login");
    }
  }, [type, router]);

  // 3. no error
  if (!type) return null;

  if (type === "UNAUTHORIZED") return null;
  switch (type) {
    case "NOT_FOUND":
      return <Error404 />;

    case "FORBIDDEN":
      return <Error403 />;

    case "SERVER_ERROR":
      return <Error500 onRetry={onRetry} />

    case "NETWORK":
      return <ErrorNetwork />;

    default:
      return <Error500 onRetry={onRetry} />
  }
}
