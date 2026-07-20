import axios from "axios";

interface ApiErrorResponse {
  message?: string;
  error?: string;
  details?: string;
}

export function getApiErrorMessage(
  error: unknown,
  fallback = "Đã xảy ra lỗi. Vui lòng thử lại.",
): string {
  type ApiErrorData = ApiErrorResponse | string;

  if (!axios.isAxiosError<ApiErrorData>(error)) {
    return error instanceof Error ? error.message : fallback;
  }

  const data = error.response?.data;

  if (typeof data === "string") {
    return data.trim() || fallback;
  }

  return (
    data?.message?.trim() ||
    data?.error?.trim() ||
    data?.details?.trim() ||
    error.message ||
    fallback
  );
}
