import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth.store";

import {
  fetchAccountProfile,
  updateAccountProfile,
  changePassword,
  fetchTicketHistory,
  uploadAccountAvatar,
  fetchTicketDetail,
} from "@/services/client/account.service";

export function useAccountProfile() {
  const accessToken = useAuthStore((s) => s.accessToken);

  return useQuery({
    queryKey: ["account-profile"],
    queryFn: fetchAccountProfile,
    enabled: Boolean(accessToken),
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

export function useUpdateAccountProfile() {
  return useMutation({
    mutationFn: updateAccountProfile,
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: changePassword,
  });
}

export function useUploadAccountAvatar() {
  return useMutation({
    mutationFn: uploadAccountAvatar,
  });
}

export function useTicketHistory() {
  const accessToken = useAuthStore((s) => s.accessToken);

  return useQuery({
    queryKey: ["ticket-history"],
    queryFn: fetchTicketHistory,
    enabled: Boolean(accessToken),
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

export function useTicketDetail(bookingId: number | null) {
  const accessToken = useAuthStore((s) => s.accessToken);

  return useQuery({
    queryKey: ["ticket-detail", bookingId],
    queryFn: () => fetchTicketDetail(bookingId!),
    enabled: Boolean(accessToken) && Boolean(bookingId),
    retry: 1,
    refetchOnWindowFocus: false,
  });
}