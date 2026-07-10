import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createAdminUserApi,
  fetchAdminUsers,
  updateAdminUserApi,
  updateAdminUserStatusApi,
  fetchAdminUserDetail,
  fetchAdminGuestDetail,
  resetAdminUserPasswordApi,
} from "@/services/admin/user.service";

import type {
  AdminUserItem,
  AdminUserListParams,
} from "@/types/admin/users/user-management.type";

export function useUsers(params: AdminUserListParams) {
  return useQuery({
    queryKey: ["admin-users", params],
    queryFn: () => fetchAdminUsers(params),
    staleTime: 1000 * 60,
    retry: 1,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation<any, Error, any>({
    mutationFn: createAdminUserApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation<
    any,
    Error,
    {
      userId: number;
      payload: {
        fullName: string;
        email?: string | null;
        phone?: string | null;
      };
    }
  >({
    mutationFn: ({ userId, payload }) => updateAdminUserApi(userId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();

  return useMutation<
    any,
    Error,
    {
      userId: number;
      status: "ACTIVE" | "BLOCKED";
    }
  >({
    mutationFn: ({ userId, status }) =>
      updateAdminUserStatusApi(userId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
}

export function useUserDetail(user: AdminUserItem | null) {
  return useQuery({
    queryKey: [
      "admin-user-detail",
      user?.customerType,
      user?.userId,
      user?.email,
      user?.phone,
    ],
    queryFn: () => {
      if (!user) throw new Error("Thiếu thông tin khách hàng");

      if (user.customerType === "GUEST") {
        return fetchAdminGuestDetail({
          email: user.email,
          phone: user.phone,
        });
      }

      return fetchAdminUserDetail(user.userId!);
    },
    enabled: !!user,
    staleTime: 1000 * 30,
  });
}

export function useResetUserPassword() {
  return useMutation<
    any,
    Error,
    {
      userId: number;
      newPassword: string;
    }
  >({
    mutationFn: ({ userId, newPassword }) =>
      resetAdminUserPasswordApi(userId, { newPassword }),
  });
}
