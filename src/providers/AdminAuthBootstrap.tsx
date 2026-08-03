"use client";

import { useEffect } from "react";

import { restoreAdminSession } from "@/services/admin/admin-auth.service";
import { useAdminAuthStore } from "@/store/admin-auth.store";

export default function AdminAuthBootstrap({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialized = useAdminAuthStore((state) => state.initialized);
  const setAuth = useAdminAuthStore((state) => state.setAuth);
  const clearAuth = useAdminAuthStore((state) => state.clearAuth);
  const setInitialized = useAdminAuthStore((state) => state.setInitialized);

  useEffect(() => {
    if (initialized) return;

    let active = true;

    async function bootstrapAdminAuth() {
      try {
        const data = await restoreAdminSession();

        if (!active) return;

        setAuth({
          accessToken: data.accessToken,
          user: data.user,
        });
      } catch {
        if (!active) return;

        clearAuth();
      } finally {
        if (active) {
          setInitialized(true);
        }
      }
    }

    bootstrapAdminAuth();

    return () => {
      active = false;
    };
  }, [initialized, setAuth, clearAuth, setInitialized]);

  if (!initialized) {
    return null;
  }

  return children;
}
