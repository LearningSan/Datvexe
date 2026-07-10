import api from "@/lib/client/api";
import type { ApiResponse } from "@/types/common/api.type";
import type {
  AdminUserListParams,
  AdminUserListResponse,
} from "@/types/admin/users/user-management.type";

function throwApiError(error: any, fallback: string): never {
  const message =
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback;

  throw new Error(message);
}

export async function fetchAdminUsers(params: AdminUserListParams) {
  try {
    const res = await api.get<ApiResponse<AdminUserListResponse>>(
      "/admin/users",
      { params },
    );

    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể tải danh sách người dùng");
  }
}

export async function createAdminUserApi(payload: any) {
  try {
    const res = await api.post("/admin/users", payload);
    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể tạo tài khoản");
  }
}

export async function updateAdminUserApi(userId: number, payload: any) {
  try {
    const res = await api.patch(`/admin/users/${userId}`, payload);
    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể cập nhật tài khoản");
  }
}

export async function updateAdminUserStatusApi(
  userId: number,
  status: "ACTIVE" | "BLOCKED",
) {
  try {
    const res = await api.patch(`/admin/users/${userId}/status`, { status });
    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể cập nhật trạng thái tài khoản");
  }
}

export async function fetchAdminUserDetail(userId: number) {
  try {
    const res = await api.get(`/admin/users/${userId}`);
    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể tải chi tiết khách hàng");
  }
}

export async function fetchAdminGuestDetail(params: {
  email?: string | null;
  phone?: string | null;
}) {
  try {
    const res = await api.get("/admin/users/guest-detail", { params });
    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể tải chi tiết khách vãng lai");
  }
}

export async function resetAdminUserPasswordApi(
  userId: number,
  payload: { newPassword: string },
) {
  try {
    const res = await api.patch(
      `/admin/users/${userId}/reset-password`,
      payload,
    );
    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể reset mật khẩu");
  }
}
