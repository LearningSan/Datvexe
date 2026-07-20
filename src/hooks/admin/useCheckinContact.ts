import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getPassengerContactHistoryApi,
  updatePassengerContactApi,
} from "@/services/admin/checkin/checkin-contact.service";

import { adminCheckinQueryKeys } from "@/hooks/admin/useCheckinQuery";

import type { UpdatePassengerContactPayload } from "@/types/admin/checkin/checkin-operation.type";

export const checkinContactQueryKeys = {
  root: ["admin", "checkins", "contact"] as const,

  history: (bookingId: number, tripId: number) =>
    [...checkinContactQueryKeys.root, "history", bookingId, tripId] as const,
};

export function useUpdatePassengerContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdatePassengerContactPayload) =>
      updatePassengerContactApi(payload),

    onSuccess: async (_response, variables) => {
      /*
       * Refresh toàn bộ danh sách hành khách của chuyến,
       * không phụ thuộc filter và keyword hiện tại.
       */
      await queryClient.invalidateQueries({
        queryKey: [
          ...adminCheckinQueryKeys.root,
          "trip-passengers",
          variables.tripId,
        ],
      });

      await queryClient.invalidateQueries({
        queryKey: [...adminCheckinQueryKeys.root, "upcoming-trips"],
      });

      await queryClient.invalidateQueries({
        queryKey: checkinContactQueryKeys.history(
          variables.bookingId,
          variables.tripId,
        ),
      });
    },
  });
}

export function usePassengerContactHistory(
  bookingId: number | null,
  tripId: number | null,
  enabled = true,
) {
  return useQuery({
    queryKey: checkinContactQueryKeys.history(bookingId ?? 0, tripId ?? 0),

    queryFn: () =>
      getPassengerContactHistoryApi({
        bookingId: bookingId as number,

        tripId: tripId as number,
      }),

    enabled:
      enabled &&
      typeof bookingId === "number" &&
      bookingId > 0 &&
      typeof tripId === "number" &&
      tripId > 0,

    staleTime: 15 * 1000,

    gcTime: 5 * 60 * 1000,

    retry: 1,
  });
}
