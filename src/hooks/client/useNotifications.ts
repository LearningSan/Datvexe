import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth.store";

import {
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/services/client/notification.service";

export function useNotifications(enabled: boolean = true) {
  const accessToken = useAuthStore((s) => s.accessToken);

  return useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    enabled: enabled && Boolean(accessToken),
    staleTime: 1000 * 30,
    refetchInterval: enabled && accessToken ? 1000 * 60 : false,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllNotificationsAsRead,

    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });

      const previous = queryClient.getQueryData<any>(["notifications"]);

      queryClient.setQueryData(["notifications"], (old: any) => {
        if (!old) return old;

        return {
          ...old,
          unreadCount: 0,
          items: old.items.map((item: any) => ({
            ...item,
            isRead: true,
          })),
        };
      });

      return { previous };
    },

    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["notifications"], context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
