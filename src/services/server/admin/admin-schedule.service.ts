import {
  createScheduleTemplateRepo,
  findAdminScheduleOptions,
  findAdminScheduleTemplates,
  findScheduleTemplateById,
  updateScheduleTemplateRepo,
  updateScheduleTemplateStatusRepo,
  generateTripsFromScheduleRepo,
} from "@/repositories/admin/schedule.repo";

import type {
  AdminScheduleTemplateListParams,
  CreateAdminScheduleTemplatePayload,
  UpdateAdminScheduleTemplatePayload,
  GenerateTripsFromSchedulePayload,
} from "@/types/admin/schedules/schedule-management.type";

export async function generateTripsFromSchedule(
  payload: GenerateTripsFromSchedulePayload,
) {
  if (new Date(payload.dateTo) < new Date(payload.dateFrom)) {
    throw new Error("Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu");
  }

  return await generateTripsFromScheduleRepo(payload);
}
export async function getAdminScheduleTemplates(
  params: AdminScheduleTemplateListParams,
) {
  return await findAdminScheduleTemplates(params);
}

export async function getAdminScheduleOptions() {
  return await findAdminScheduleOptions();
}

export async function createAdminScheduleTemplate(
  data: CreateAdminScheduleTemplatePayload,
) {
  return await createScheduleTemplateRepo(data);
}

export async function updateAdminScheduleTemplate(
  scheduleTemplateId: number,
  data: UpdateAdminScheduleTemplatePayload,
) {
  const existing = await findScheduleTemplateById(scheduleTemplateId);

  if (!existing) {
    throw new Error("Lịch chạy mẫu không tồn tại");
  }

  if (existing.tripCount > 0) {
    throw new Error(
      "Lịch chạy đã được dùng để tạo chuyến. Không nên sửa giờ chạy trực tiếp, hãy tạm ngưng lịch cũ và tạo lịch mới",
    );
  }

  return await updateScheduleTemplateRepo(scheduleTemplateId, data);
}

export async function updateAdminScheduleTemplateStatus(
  scheduleTemplateId: number,
  isActive: boolean,
) {
  const existing = await findScheduleTemplateById(scheduleTemplateId);

  if (!existing) {
    throw new Error("Lịch chạy mẫu không tồn tại");
  }

  return await updateScheduleTemplateStatusRepo(scheduleTemplateId, isActive);
}
