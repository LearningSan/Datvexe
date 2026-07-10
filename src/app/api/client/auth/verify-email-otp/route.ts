import { NextRequest } from "next/server";
import crypto from "crypto";

import { verifyEmailSchema } from "@/validators/client/auth.validator";
import {
  findUserByEmailOrPhone,
  verifyEmailToken,
  markEmailVerified,
} from "@/repositories/client/auth.repo";
import { successResponse, errorResponse } from "@/lib/server/response";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const payload = verifyEmailSchema.parse(body);

    const user = await findUserByEmailOrPhone(
      payload.email.trim().toLowerCase(),
    );

    if (!user) {
      throw new Error("USER_NOT_FOUND");
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(payload.otp)
      .digest("hex");

    const token = await verifyEmailToken(tokenHash);

    if (!token || token.user_id !== user.user_id) {
      throw new Error("OTP_INVALID_OR_EXPIRED");
    }

    await markEmailVerified({
      tokenId: token.id,
      userId: user.user_id,
    });

    return successResponse({
      message: "Xác thực email thành công",
    });
  } catch (error: any) {
    console.error("[VERIFY EMAIL OTP ERROR]", error);

    if (error.name === "ZodError") {
      return errorResponse(
        error.errors?.[0]?.message || "Dữ liệu không hợp lệ",
        null,
        400,
      );
    }

    return errorResponse(error.message || "Xác thực email thất bại", null, 400);
  }
}
