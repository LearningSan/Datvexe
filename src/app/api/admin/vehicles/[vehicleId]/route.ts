import { NextRequest } from "next/server";
import { updateAdminVehicle } from "@/services/server/admin/admin-vehicle.service";
import { updateAdminVehicleSchema } from "@/validators/admin/vehicle.validator";
import { successResponse, errorResponse } from "@/lib/server/response";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ vehicleId: string }> },
) {
  try {
    const { vehicleId } = await params;
    const body = await req.json();
    const parsed = updateAdminVehicleSchema.parse(body);

    const data = await updateAdminVehicle(Number(vehicleId), parsed);
    return successResponse(data, "Cập nhật xe thành công");
  } catch (error: any) {
    if (error.name === "ZodError") {
      return errorResponse(error.errors?.[0]?.message, null, 400);
    }

    if (error?.code === "ER_DUP_ENTRY") {
      return errorResponse("Mã xe hoặc biển số xe đã tồn tại", null, 400);
    }

    return errorResponse(error.message || "Không thể cập nhật xe", null, 500);
  }
}