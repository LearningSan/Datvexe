import { NextRequest } from "next/server";
import { ZodError } from "zod";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";

import { successResponse, errorResponse } from "@/lib/server/response";

import {
  createAdminPromotion,
  getAdminPromotions,
} from "@/services/server/admin/admin-promotion.service";

import {
  adminPromotionListQuerySchema,
  createAdminPromotionSchema,
} from "@/validators/admin/promotion.validator";

interface MysqlError {
  code?: string;
  sqlMessage?: string;
  message?: string;
}

function isMysqlError(error: unknown): error is MysqlError {
  return typeof error === "object" && error !== null;
}

export async function GET(req: NextRequest) {
  try {
    await getAdminAuthUserId(req);

    const searchParams = Object.fromEntries(req.nextUrl.searchParams);

    const parsed = adminPromotionListQuerySchema.parse(searchParams);

    const data = await getAdminPromotions(parsed);

    return successResponse(data);
  } catch (error: unknown) {
    console.error("[ADMIN PROMOTIONS LIST ERROR]", error);

    const message =
      error instanceof Error
        ? error.message
        : "Không thể lấy danh sách khuyến mãi";

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    if (error instanceof ZodError) {
      return errorResponse(
        error.issues[0]?.message || "Dữ liệu lọc khuyến mãi không hợp lệ",
        null,
        400,
      );
    }

    return errorResponse(message, null, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    await getAdminAuthUserId(req);

    const body = await req.json();

    const parsed = createAdminPromotionSchema.parse(body);

    const data = await createAdminPromotion(parsed);

    return successResponse(data, "Tạo khuyến mãi thành công", 201);
  } catch (error: unknown) {
    console.error("[CREATE ADMIN PROMOTION ERROR]", error);

    const message =
      error instanceof Error ? error.message : "Không thể tạo khuyến mãi";

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    if (error instanceof SyntaxError) {
      return errorResponse("Dữ liệu JSON không hợp lệ", null, 400);
    }

    if (error instanceof ZodError) {
      return errorResponse(
        error.issues[0]?.message || "Dữ liệu khuyến mãi không hợp lệ",
        null,
        400,
      );
    }

    if (isMysqlError(error) && error.code === "ER_DUP_ENTRY") {
      return errorResponse(
        "Mã khuyến mãi đã tồn tại trong hệ thống",
        null,
        409,
      );
    }

    return errorResponse(message, null, 500);
  }
}
