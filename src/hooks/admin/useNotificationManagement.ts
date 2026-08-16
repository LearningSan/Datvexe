import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchAdminNotifications,
  fetchAdminNotificationDetail,
  createAdminNotificationApi,
  updateAdminNotificationApi,
  updateAdminNotificationReadStatusApi,
  deleteAdminNotificationApi,
  searchAdminNotificationRecipientsApi,
} from "@/services/admin/notification.service";

import type {
  AdminNotificationListParams,
  CreateAdminNotificationPayload,
  UpdateAdminNotificationPayload,
} from "@/types/admin/notifications/notification-management.type";

const ADMIN_NOTIFICATIONS_KEY = ["admin-notifications"];

export function useNotifications(params: AdminNotificationListParams) {
  return useQuery({
    queryKey: [...ADMIN_NOTIFICATIONS_KEY, params],

    queryFn: () => fetchAdminNotifications(params),
    meta: {
      globalLoading: false,
    },
    staleTime: 1000 * 30,

    retry: 1,
  });
}

export function useNotificationDetail(notificationId: number | null) {
  return useQuery({
    queryKey: ["admin-notification-detail", notificationId],

    queryFn: () => {
      if (!notificationId) {
        throw new Error("Thiếu mã thông báo");
      }

      return fetchAdminNotificationDetail(notificationId);
    },
    meta: {
      globalLoading: false,
    },
    enabled: !!notificationId,

    staleTime: 1000 * 30,
  });
}

export function useCreateNotification() {
  const queryClient = useQueryClient();

  return useMutation<any, Error, CreateAdminNotificationPayload>({
    mutationFn: createAdminNotificationApi,
    meta: {
      globalLoading: false,
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ADMIN_NOTIFICATIONS_KEY,
      });
    },
  });
}

export function useUpdateNotification() {
  const queryClient = useQueryClient();

  return useMutation<
    any,
    Error,
    {
      notificationId: number;

      payload: UpdateAdminNotificationPayload;
    }
  >({
    mutationFn: ({ notificationId, payload }) =>
      updateAdminNotificationApi(notificationId, payload),
    meta: {
      globalLoading: false,
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ADMIN_NOTIFICATIONS_KEY,
      });

      queryClient.invalidateQueries({
        queryKey: ["admin-notification-detail", variables.notificationId],
      });
    },
  });
}

export function useUpdateNotificationReadStatus() {
  const queryClient = useQueryClient();

  return useMutation<
    any,
    Error,
    {
      notificationId: number;

      isRead: boolean;
    }
  >({
    mutationFn: ({ notificationId, isRead }) =>
      updateAdminNotificationReadStatusApi(notificationId, isRead),
    meta: {
      globalLoading: false,
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ADMIN_NOTIFICATIONS_KEY,
      });

      queryClient.invalidateQueries({
        queryKey: ["admin-notification-detail", variables.notificationId],
      });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation<any, Error, number>({
    mutationFn: deleteAdminNotificationApi,
    meta: {
      globalLoading: false,
    },
    onSuccess: (_data, notificationId) => {
      queryClient.invalidateQueries({
        queryKey: ADMIN_NOTIFICATIONS_KEY,
      });

      queryClient.removeQueries({
        queryKey: ["admin-notification-detail", notificationId],
      });
    },
  });
}
export function useNotificationRecipientSearch(keyword: string) {
  return useQuery({
    queryKey: ["admin-notification-recipients", keyword],
    queryFn: () => searchAdminNotificationRecipientsApi(keyword),
    meta: {
      globalLoading: false,
    },
    enabled: keyword.trim().length >= 2,
    staleTime: 1000 * 30,
    retry: 1,
  });
}
