import { AppErrorType } from "@/types/error/error.type";

export function mapError(error: any): AppErrorType {
  if (!error?.response) {
    return "NETWORK";
  }

  const status = error?.response?.status;

  switch (status) {
    case 400:
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
      return "SERVER_ERROR";
    default:
      return "UNKNOWN";
  }
}
