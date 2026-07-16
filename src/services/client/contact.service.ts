import api from "@/lib/client/api";

import type { ApiResponse } from "@/types/common/api.type";
import type { ContactFormPayload } from "@/types/client/contact/contact.type";

export async function sendContactRequest(payload: ContactFormPayload) {
  const response = await api.post<
    ApiResponse<{
      received: boolean;
    }>
  >("/client/contact", payload);

  return response.data.data;
}
