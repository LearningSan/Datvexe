import api from "@/lib/client/api";
import type { ApiResponse } from "@/types/common/api.type";

import type {
  AdminScheduleTemplateListParams,
  AdminScheduleTemplateListResponse,
  AdminScheduleTemplateOptionsResponse,
  CreateAdminScheduleTemplatePayload,
  UpdateAdminScheduleTemplatePayload,
  GenerateTripsFromSchedulePayload,
  GenerateTripsFromScheduleResult,
} from "@/types/admin/schedules/schedule-management.type";

export async function generateTripsFromScheduleApi(
  payload: GenerateTripsFromSchedulePayload,
) {
  try {
    const res = await api.post<ApiResponse<GenerateTripsFromScheduleResult>>(
      "/admin/schedule-templates/generate-trips",
      payload,
    );

    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể sinh chuyến từ lịch mẫu");
  }
}
function throwApiError(error: any, fallback: string): never {
  const message =
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback;

  throw new Error(message);
}

export async function fetchAdminScheduleTemplates(
  params: AdminScheduleTemplateListParams,
) {
  try {
    const res = await api.get<ApiResponse<AdminScheduleTemplateListResponse>>(
      "/admin/schedule-templates",
      { params },
    );

    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể tải danh sách lịch chạy");
  }
}

export async function fetchAdminScheduleOptions() {
  try {
    const res = await api.get<
      ApiResponse<AdminScheduleTemplateOptionsResponse>
    >("/admin/schedule-templates/options");

    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể tải dữ liệu tuyến xe");
  }
}

export async function createAdminScheduleTemplateApi(
  payload: CreateAdminScheduleTemplatePayload,
) {
  try {
    const res = await api.post("/admin/schedule-templates", payload);
    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể tạo lịch chạy mẫu");
  }
}

export async function updateAdminScheduleTemplateApi(
  scheduleTemplateId: number,
  payload: UpdateAdminScheduleTemplatePayload,
) {
  try {
    const res = await api.patch(
      `/admin/schedule-templates/${scheduleTemplateId}`,
      payload,
    );

    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể cập nhật lịch chạy mẫu");
  }
}

export async function updateAdminScheduleTemplateStatusApi(
  scheduleTemplateId: number,
  isActive: boolean,
) {
  try {
    const res = await api.patch(
      `/admin/schedule-templates/${scheduleTemplateId}/status`,
      { isActive },
    );

    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể cập nhật trạng thái lịch chạy");
  }
}
