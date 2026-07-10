import { useMutation } from "@tanstack/react-query";

import {
  login,
  logout,
  register,
  verifyEmailOtp,
} from "@/services/client/auth.service";

import { useAuthStore } from "@/store/auth.store";

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      setAuth({
        accessToken: data.accessToken,
        user: data.user,
      });
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: register,
  });
}

export function useVerifyEmailOtp() {
  return useMutation({
    mutationFn: verifyEmailOtp,
  });
}

export function useLogout() {
  const clearAuth = useAuthStore((s) => s.clearAuth);

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      clearAuth();
    },
  });
}
