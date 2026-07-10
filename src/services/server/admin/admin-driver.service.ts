import {
  findAdminDrivers,
  createAdminDriverRepo,
  updateAdminDriverRepo,
  updateAdminDriverStatusRepo,
  deleteAdminDriverRepo,
  findAdminDriverDetail,
  resetAdminDriverPasswordRepo,
} from "@/repositories/admin/driver.repo";
import bcrypt from "bcryptjs";

import type { AdminDriverListParams } from "@/types/admin/drivers/driver-management.type";

export async function getAdminDrivers(params: AdminDriverListParams) {
  return await findAdminDrivers(params);
}

export async function deleteAdminDriver(driverId: number) {
  return await deleteAdminDriverRepo(driverId);
}
export async function createAdminDriver(data: {
  fullName: string;
  email?: string | null;
  phone?: string | null;
  password: string;
  roleId: number;
  driverType: "BUS" | "SHUTTLE" | "BOTH";
  licenseNumber: string;
  hiredDate?: string | null;
}) {
  const passwordHash = await bcrypt.hash(data.password, 10);

  return await createAdminDriverRepo({
    ...data,
    passwordHash,
  });
}

export async function updateAdminDriver(
  driverId: number,
  data: {
    fullName: string;
    email?: string | null;
    phone?: string | null;
    driverType: "BUS" | "SHUTTLE" | "BOTH";
    licenseNumber: string;
    hiredDate?: string | null;
  },
) {
  return await updateAdminDriverRepo(driverId, data);
}

export async function updateAdminDriverStatus(
  driverId: number,
  status: "AVAILABLE" | "ASSIGNED" | "OFF",
) {
  return await updateAdminDriverStatusRepo(driverId, status);
}
export async function getAdminDriverDetail(driverId: number) {
  const data = await findAdminDriverDetail(driverId);

  if (!data) {
    throw new Error("Không tìm thấy tài xế");
  }

  return data;
}

export async function resetAdminDriverPassword(
  driverId: number,
  newPassword: string,
) {
  if (!newPassword || newPassword.length < 6) {
    throw new Error("Mật khẩu mới phải có ít nhất 6 ký tự");
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  return await resetAdminDriverPasswordRepo(driverId, passwordHash);
}