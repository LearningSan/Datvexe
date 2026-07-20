import crypto from "crypto";
import { SignJWT, jwtVerify } from "jose";

const adminAccessSecret = new TextEncoder().encode(
  process.env.ADMIN_JWT_ACCESS_SECRET!,
);

const adminRefreshSecret = new TextEncoder().encode(
  process.env.ADMIN_JWT_REFRESH_SECRET!,
);

type AdminAccessTokenPayload = {
  userId: number;
  roleId: number;
  sessionId: number;
};

type AdminRefreshTokenPayload = {
  userId: number;
  sessionId: number;
};

export function generateAdminTokenId() {
  return crypto.randomUUID();
}

export async function createAdminAccessToken(payload: AdminAccessTokenPayload) {
  return new SignJWT({
    userId: payload.userId,
    roleId: payload.roleId,
    sessionId: payload.sessionId,
    tokenType: "ADMIN_ACCESS",
  })
    .setProtectedHeader({
      alg: "HS256",
      typ: "JWT",
    })
    .setIssuer("admin-auth")
    .setAudience("admin-api")
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(adminAccessSecret);
}

export async function createAdminRefreshToken(
  payload: AdminRefreshTokenPayload,
) {
  return new SignJWT({
    userId: payload.userId,
    sessionId: payload.sessionId,
    tokenType: "ADMIN_REFRESH",
  })
    .setProtectedHeader({
      alg: "HS256",
      typ: "JWT",
    })
    .setIssuer("admin-auth")
    .setAudience("admin-refresh")
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(adminRefreshSecret);
}

export async function verifyAdminAccessToken(
  token: string,
): Promise<AdminAccessTokenPayload> {
  const { payload } = await jwtVerify(token, adminAccessSecret, {
    algorithms: ["HS256"],
    issuer: "admin-auth",
    audience: "admin-api",
  });

  if (payload.tokenType !== "ADMIN_ACCESS") {
    throw new Error("INVALID_ADMIN_ACCESS_TOKEN");
  }

  return {
    userId: Number(payload.userId),
    roleId: Number(payload.roleId),
    sessionId: Number(payload.sessionId),
  };
}

export async function verifyAdminRefreshToken(
  token: string,
): Promise<AdminRefreshTokenPayload> {
  const { payload } = await jwtVerify(token, adminRefreshSecret, {
    algorithms: ["HS256"],
    issuer: "admin-auth",
    audience: "admin-refresh",
  });

  if (payload.tokenType !== "ADMIN_REFRESH") {
    throw new Error("INVALID_ADMIN_REFRESH_TOKEN");
  }

  return {
    userId: Number(payload.userId),
    sessionId: Number(payload.sessionId),
  };
}
