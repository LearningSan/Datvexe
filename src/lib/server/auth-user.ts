import { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const accessSecret = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!);

export async function getAuthUserId(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("UNAUTHORIZED");
    }

    const token = authHeader.replace("Bearer ", "");

    const { payload } = await jwtVerify(token, accessSecret);

    const userId = Number(payload.userId);

    if (!userId) {
      throw new Error("UNAUTHORIZED");
    }

    return userId;
  } catch {
    throw new Error("UNAUTHORIZED");
  }
}
