import {
  duplicateSeatLayoutRepo,
  findSeatLayoutDetail,
  findSeatLayouts,
  updateSeatLayoutStatusRepo,
} from "@/repositories/admin/seat-layout.repo";

export async function getAdminSeatLayouts() {
  return await findSeatLayouts();
}

export async function getAdminSeatLayoutDetail(seatLayoutId: number) {
  const data = await findSeatLayoutDetail(seatLayoutId);
  if (!data) throw new Error("Không tìm thấy sơ đồ ghế");

  return data;
}

export async function duplicateAdminSeatLayout(
  seatLayoutId: number,
  payload: { layoutCode: string; layoutName: string },
) {
  return await duplicateSeatLayoutRepo(seatLayoutId, payload);
}

export async function updateAdminSeatLayoutStatus(
  seatLayoutId: number,
  isActive: boolean,
) {
  return await updateSeatLayoutStatusRepo(seatLayoutId, isActive);
}
