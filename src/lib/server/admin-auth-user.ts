import { NextRequest } from "next/server";

import { verifyAdminAccessToken } from "@/lib/server/admin-jwt";

export async function getAdminAuthUserId(req: NextRequest): Promise<number> {
  const authHeader = req.headers.get("authorization");

 

  if (!authHeader?.startsWith("Bearer ")) {
    console.error("[ADMIN AUTH ERROR] Missing Bearer token");

    throw new Error("UNAUTHORIZED");
  }

  const token = authHeader.slice(7).trim();

  if (!token) {
    console.error("[ADMIN AUTH ERROR] Empty token");

    throw new Error("UNAUTHORIZED");
  }

  try {
    const payload = await verifyAdminAccessToken(token);


    const userId = Number(payload.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
      console.error("[ADMIN AUTH ERROR] Invalid userId", {
        userId: payload.userId,
      });

      throw new Error("UNAUTHORIZED");
    }

    return userId;
  } catch (error: unknown) {
    console.error("[VERIFY ADMIN ACCESS TOKEN ERROR]", error);

    throw new Error("UNAUTHORIZED");
  }
}
