import { NextRequest } from "next/server";

import { updateAdminDriverStatus } from "@/services/server/admin/admin-driver.service";
import { updateAdminDriverStatusSchema } from "@/validators/admin/driver.validator";
import { successResponse, errorResponse } from "@/lib/server/response";

interface Context {
  params: Promise<{
    driverId: string;
  }>;
}

export async function PATCH(req: NextRequest, context: Context) {
  try {
    const params = await context.params;
    const driverId = Number(params.driverId);

    if (!driverId) {
      return errorResponse("driverId không hợp lệ", null, 400);
    }

    const body = await req.json();
    const parsed = updateAdminDriverStatusSchema.parse(body);

    const data = await updateAdminDriverStatus(driverId, parsed.status);

    return successResponse(data, "Cập nhật trạng thái tài xế thành công");
  } catch (error: any) {
    console.error("[UPDATE DRIVER STATUS ERROR]", error);

    if (error.name === "ZodError") {
      return errorResponse(error.errors?.[0]?.message, null, 400);
    }

    return errorResponse(
      error.message || "Không thể cập nhật trạng thái",
      null,
      500,
    );
  }
}
