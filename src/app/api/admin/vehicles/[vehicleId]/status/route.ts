import { NextRequest } from "next/server";
import { updateAdminVehicleStatus } from "@/services/server/admin/admin-vehicle.service";
import { updateVehicleStatusSchema } from "@/validators/admin/vehicle.validator";
import { successResponse, errorResponse } from "@/lib/server/response";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ vehicleId: string }> },
) {
  try {
    const { vehicleId } = await params;
    const body = await req.json();
    const parsed = updateVehicleStatusSchema.parse(body);

    const data = await updateAdminVehicleStatus(
      Number(vehicleId),
      parsed.status,
    );
    return successResponse(data, "Cập nhật trạng thái xe thành công");
  } catch (error: any) {
    return errorResponse(
      error.message || "Không thể cập nhật trạng thái xe",
      null,
      500,
    );
  }
}
