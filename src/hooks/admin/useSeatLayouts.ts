import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  duplicateAdminSeatLayoutApi,
  fetchAdminSeatLayoutDetail,
  fetchAdminSeatLayouts,
  updateAdminSeatLayoutStatusApi,
} from "@/services/admin/seat-layout.service";
import type { DuplicateSeatLayoutPayload } from "@/types/admin/seat-layouts/seat-layout-management.type";

export function useSeatLayouts() {
  return useQuery({
    queryKey: ["admin-seat-layouts"],
    queryFn: fetchAdminSeatLayouts,
  });
}

export function useSeatLayoutDetail(seatLayoutId?: number) {
  return useQuery({
    queryKey: ["admin-seat-layout-detail", seatLayoutId],
    queryFn: () => fetchAdminSeatLayoutDetail(Number(seatLayoutId)),
    enabled: !!seatLayoutId,
  });
}

export function useDuplicateSeatLayout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      seatLayoutId,
      payload,
    }: {
      seatLayoutId: number;
      payload: DuplicateSeatLayoutPayload;
    }) => duplicateAdminSeatLayoutApi(seatLayoutId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-seat-layouts"] });
    },
  });
}

export function useUpdateSeatLayoutStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      seatLayoutId,
      isActive,
    }: {
      seatLayoutId: number;
      isActive: boolean;
    }) => updateAdminSeatLayoutStatusApi(seatLayoutId, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-seat-layouts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-seat-layout-detail"] });
    },
  });
}
