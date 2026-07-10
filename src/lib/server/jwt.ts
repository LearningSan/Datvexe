import { SignJWT, jwtVerify } from "jose";
import crypto from "crypto";

const accessSecret = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!);
const refreshSecret = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET!);

export function generateTokenId() {
  return crypto.randomUUID();
}

export async function createAccessToken(payload: {
  userId: number;
  roleId: number;
  sessionId: number;
}) {
  return await new SignJWT({
    userId: payload.userId,
    roleId: payload.roleId,
    sessionId: payload.sessionId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(accessSecret);
}

export async function createRefreshToken(payload: {
  userId: number;
  sessionId: number;
}) {
  return await new SignJWT({
    userId: payload.userId,
    sessionId: payload.sessionId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(refreshSecret);
}

export async function verifyAccessToken(token: string) {
  const { payload } = await jwtVerify(token, accessSecret);
  return payload as unknown as {
    userId: number;
    roleId: number;
    sessionId: number;
  };
}

export async function verifyRefreshToken(token: string) {
  const { payload } = await jwtVerify(token, refreshSecret);
  return payload as unknown as {
    userId: number;
    sessionId: number;
  };
}
