export type AdminAuthErrorCode =
  | "INVALID_CREDENTIALS"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "ACCOUNT_BLOCKED"
  | "SESSION_EXPIRED";

export class AdminAuthError extends Error {
  readonly code: AdminAuthErrorCode;
  readonly statusCode: number;

  constructor(code: AdminAuthErrorCode, message: string, statusCode: number) {
    super(message);

    this.name = "AdminAuthError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export function invalidAdminCredentialsError() {
  return new AdminAuthError(
    "INVALID_CREDENTIALS",
    "Email hoặc mật khẩu không chính xác",
    401,
  );
}

export function unauthorizedAdminError() {
  return new AdminAuthError(
    "UNAUTHORIZED",
    "Phiên đăng nhập quản trị không hợp lệ",
    401,
  );
}

export function adminSessionExpiredError() {
  return new AdminAuthError(
    "SESSION_EXPIRED",
    "Phiên đăng nhập quản trị đã hết hạn",
    401,
  );
}

export function forbiddenAdminError() {
  return new AdminAuthError(
    "FORBIDDEN",
    "Tài khoản không có quyền quản trị",
    403,
  );
}

export function blockedAdminError() {
  return new AdminAuthError(
    "ACCOUNT_BLOCKED",
    "Tài khoản quản trị đã bị khóa",
    403,
  );
}

export function isAdminAuthError(error: unknown): error is AdminAuthError {
  return error instanceof AdminAuthError;
}
