import api from "@/lib/client/api";

import { ApiResponse } from "@/types/common/api.type";

import { CurrentUser } from "@/types/client/user/current-user.type";

export async function fetchCurrentUser() {
  const res = await api.get<ApiResponse<CurrentUser | null>>("/client/me");

  return res.data.data;
}
