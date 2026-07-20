import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  loginAdmin,
  logoutAdmin,
  restoreAdminSession,
} from "@/services/admin/admin-auth.service";

import { useAdminAuthStore } from "@/store/admin-auth.store";

let restorePromise: Promise<void> | null = null;

export function useAdminAuth() {
  const queryClient = useQueryClient();

  const accessToken = useAdminAuthStore((state) => state.accessToken);

  const user = useAdminAuthStore((state) => state.user);

  const initialized = useAdminAuthStore((state) => state.initialized);

  const setAuth = useAdminAuthStore((state) => state.setAuth);

  const clearAuth = useAdminAuthStore((state) => state.clearAuth);

  const setInitialized = useAdminAuthStore((state) => state.setInitialized);

  const loginMutation = useMutation({
    mutationFn: loginAdmin,

    onSuccess: (data) => {
      setAuth({
        accessToken: data.accessToken,
        user: data.user,
      });

      setInitialized(true);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: logoutAdmin,

    onSettled: () => {
      clearAuth();
      setInitialized(true);

      queryClient.removeQueries({
        queryKey: ["admin"],
      });
    },
  });

  useEffect(() => {
    if (initialized) {
      return;
    }

    if (!restorePromise) {
      restorePromise = (async () => {
        try {
          const data = await restoreAdminSession();

          useAdminAuthStore.getState().setAuth({
            accessToken: data.accessToken,
            user: data.user,
          });
        } catch {
          useAdminAuthStore.getState().clearAuth();
        } finally {
          useAdminAuthStore.getState().setInitialized(true);

          restorePromise = null;
        }
      })();
    }

    void restorePromise;
  }, [initialized]);

  async function login(payload: Parameters<typeof loginAdmin>[0]) {
    return loginMutation.mutateAsync(payload);
  }

  async function logout() {
    await logoutMutation.mutateAsync();
  }

  return {
    accessToken,
    user,
    initialized,

    isAuthenticated: Boolean(accessToken) && Boolean(user),

    login,
    logout,

    isLoggingIn: loginMutation.isPending,

    isLoggingOut: logoutMutation.isPending,

    loginError: loginMutation.error,
    logoutError: logoutMutation.error,

    resetLoginError: loginMutation.reset,

    resetLogoutError: logoutMutation.reset,
  };
}
