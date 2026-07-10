import { NextRequest } from "next/server";
import { duplicateAdminSeatLayout } from "@/services/server/admin/admin-seat-layout.service";
import { duplicateSeatLayoutSchema } from "@/validators/admin/seat-layout.validator";
import { successResponse, errorResponse } from "@/lib/server/response";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ seatLayoutId: string }> },
) {
  try {
    const { seatLayoutId } = await params;
    const body = await req.json();
    const parsed = duplicateSeatLayoutSchema.parse(body);

    const data = await duplicateAdminSeatLayout(Number(seatLayoutId), parsed);
    return successResponse(data, "Nhân bản sơ đồ ghế thành công");
  } catch (error: any) {
    if (error?.code === "ER_DUP_ENTRY") {
      return errorResponse("Mã layout mới đã tồn tại", null, 400);
    }

    return errorResponse(
      error.message || "Không thể nhân bản sơ đồ ghế",
      null,
      500,
    );
  }
}
