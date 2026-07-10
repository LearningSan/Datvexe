"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useAuthStore } from "@/store/auth.store";

export default function AuthBootstrap({
  children,
}: {
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);

  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  useEffect(() => {
    axios
      .post("/api/client/auth/refresh", {}, { withCredentials: true })
      .then((res) => {
        const data = res.data.data;

        setAuth({
          accessToken: data.accessToken,
          user: data.user,
        });
      })
      .catch(() => {
        clearAuth();
      })
      .finally(() => {
        setReady(true);
      });
  }, [setAuth, clearAuth]);

  if (!ready) return null;

  return children;
}
