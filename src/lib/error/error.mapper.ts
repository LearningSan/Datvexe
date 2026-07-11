import type { AppErrorType } from "@/types/error/error.type";

interface HttpError {
  code?: string;
  response?: {
    status?: number;
  };
}

export function mapError(error: unknown): AppErrorType {
  const httpError = error as HttpError;

  if (
    !httpError?.response ||
    httpError.code === "ERR_NETWORK" ||
    httpError.code === "ECONNABORTED"
  ) {
    return "NETWORK";
  }

  const status = httpError.response.status;

  switch (status) {
    case 400:
    case 422:
      return "BAD_REQUEST";

    case 401:
      return "UNAUTHORIZED";

    case 403:
      return "FORBIDDEN";

    case 404:
      return "NOT_FOUND";

    case 500:
    case 502:
    case 503:
    case 504:
      return "SERVER_ERROR";

    default:
      return "UNKNOWN";
  }
}
