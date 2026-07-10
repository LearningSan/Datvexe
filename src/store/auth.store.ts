import { create } from "zustand";
import type { AuthUser } from "@/types/client/auth/auth.type";

interface AuthStore {
  accessToken: string | null;
  user: AuthUser | null;
  setAuth: (data: { accessToken: string; user: AuthUser }) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  accessToken: null,
  user: null,

  setAuth: ({ accessToken, user }) =>
    set({
      accessToken,
      user,
    }),

  clearAuth: () =>
    set({
      accessToken: null,
      user: null,
    }),
}));
