import { create } from "zustand";

import type { AdminUser } from "@/types/admin/auth/admin-auth.type";

interface AdminAuthStore {
  accessToken: string | null;
  user: AdminUser | null;

  /*
   * true sau khi đã thử gọi refresh khi ứng dụng khởi động.
   */
  initialized: boolean;

  setAuth: (data: { accessToken: string; user: AdminUser }) => void;

  clearAuth: () => void;

  setInitialized: (initialized: boolean) => void;
}

export const useAdminAuthStore = create<AdminAuthStore>((set) => ({
  accessToken: null,
  user: null,
  initialized: false,

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

  setInitialized: (initialized) =>
    set({
      initialized,
    }),
}));
