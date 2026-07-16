"use client";

import { useMutation } from "@tanstack/react-query";

import { sendContactRequest } from "@/services/client/contact.service";

export function useSendContactRequest() {
  return useMutation({
    mutationFn: sendContactRequest,
  });
}
