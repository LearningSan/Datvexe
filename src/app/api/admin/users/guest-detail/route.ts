import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/server/response";
import { getAdminGuestDetail } from "@/services/server/admin/admin-user.service";

export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get("email");
    const phone = req.nextUrl.searchParams.get("phone");

    const data = await getAdminGuestDetail({ email, phone });

    return successResponse(data);
  } catch (error: any) {
    console.error("[GET ADMIN GUEST DETAIL ERROR]", error);

    return errorResponse(
      error.message || "Không thể lấy chi tiết khách vãng lai",
      null,
      500,
    );
  }
}
