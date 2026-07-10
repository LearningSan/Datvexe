import { NextRequest } from "next/server";
import { resetAdminDriverPassword } from "@/services/server/admin/admin-driver.service";
import { successResponse, errorResponse } from "@/lib/server/response";

interface Context {
  params: Promise<{
    driverId: string;
  }>;
}

function parseDriverId(value: string) {
  const driverId = Number(value);

  if (!Number.isInteger(driverId) || driverId <= 0) {
    throw new Error("driverId không hợp lệ");
  }

  return driverId;
}

export async function PATCH(req: NextRequest, context: Context) {
  try {
    const params = await context.params;
    const driverId = parseDriverId(params.driverId);

    const body = await req.json();
    const newPassword = String(body?.newPassword || "");

    const data = await resetAdminDriverPassword(driverId, newPassword);

    return successResponse(data, "Reset mật khẩu tài xế thành công");
  } catch (error: any) {
    console.error("[RESET DRIVER PASSWORD ERROR]", error);

    return errorResponse(
      error.message || "Không thể reset mật khẩu tài xế",
      null,
      error.message === "driverId không hợp lệ" ? 400 : 500,
    );
  }
}
