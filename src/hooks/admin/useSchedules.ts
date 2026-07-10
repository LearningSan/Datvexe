import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createAdminScheduleTemplateApi,
  fetchAdminScheduleOptions,
  fetchAdminScheduleTemplates,
  updateAdminScheduleTemplateApi,
  updateAdminScheduleTemplateStatusApi,
  generateTripsFromScheduleApi 
} from "@/services/admin/schedule.service";

import type {
  AdminScheduleTemplateListParams,
  CreateAdminScheduleTemplatePayload,
  UpdateAdminScheduleTemplatePayload,
   GenerateTripsFromSchedulePayload
} from "@/types/admin/schedules/schedule-management.type";


export function useGenerateTripsFromSchedule() {
  const queryClient = useQueryClient();

  return useMutation<any, ApiError, GenerateTripsFromSchedulePayload>({
    mutationFn: generateTripsFromScheduleApi,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-schedule-templates"],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin-trips"],
      });
    },
  });
}
interface ApiError {
  message?: string;
  statusCode?: number;
  error?: string;
}

export function useScheduleTemplates(
  params: AdminScheduleTemplateListParams,
) {
  return useQuery({
    queryKey: ["admin-schedule-templates", params],
    queryFn: () => fetchAdminScheduleTemplates(params),
    staleTime: 1000 * 60,
    retry: 1,
  });
}

export function useScheduleOptions() {
  return useQuery({
    queryKey: ["admin-schedule-options"],
    queryFn: fetchAdminScheduleOptions,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
}

export function useCreateScheduleTemplate() {
  const queryClient = useQueryClient();

  return useMutation<any, ApiError, CreateAdminScheduleTemplatePayload>({
    mutationFn: createAdminScheduleTemplateApi,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-schedule-templates"],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin-trip-options"],
      });
    },
  });
}

export function useUpdateScheduleTemplate() {
  const queryClient = useQueryClient();

  return useMutation<
    any,
    ApiError,
    {
      scheduleTemplateId: number;
      payload: UpdateAdminScheduleTemplatePayload;
    }
  >({
    mutationFn: ({ scheduleTemplateId, payload }) =>
      updateAdminScheduleTemplateApi(scheduleTemplateId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-schedule-templates"],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin-trip-options"],
      });
    },
  });
}

export function useUpdateScheduleTemplateStatus() {
  const queryClient = useQueryClient();

  return useMutation<
    any,
    ApiError,
    {
      scheduleTemplateId: number;
      isActive: boolean;
    }
  >({
    mutationFn: ({ scheduleTemplateId, isActive }) =>
      updateAdminScheduleTemplateStatusApi(scheduleTemplateId, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-schedule-templates"],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin-trip-options"],
      });
    },
  });
}