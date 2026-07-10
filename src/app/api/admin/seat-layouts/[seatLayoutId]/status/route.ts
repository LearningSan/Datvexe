import { NextRequest } from "next/server";
import { updateAdminSeatLayoutStatus } from "@/services/server/admin/admin-seat-layout.service";
import { updateSeatLayoutStatusSchema } from "@/validators/admin/seat-layout.validator";
import { successResponse, errorResponse } from "@/lib/server/response";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ seatLayoutId: string }> },
) {
  try {
    const { seatLayoutId } = await params;
    const body = await req.json();
    const parsed = updateSeatLayoutStatusSchema.parse(body);

    const data = await updateAdminSeatLayoutStatus(
      Number(seatLayoutId),
      parsed.isActive,
    );

    return successResponse(data, "Cập nhật trạng thái layout thành công");
  } catch (error: any) {
    return errorResponse(
      error.message || "Không thể cập nhật layout",
      null,
      500,
    );
  }
}
