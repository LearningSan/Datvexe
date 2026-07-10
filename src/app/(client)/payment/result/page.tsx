"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function PaymentResultPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const bookingId = searchParams.get("bookingId");

    if (bookingId) {
      router.replace(`/payment/${bookingId}`);
      return;
    }

    router.replace("/trips");
  }, [router, searchParams]);

  return <div style={{ padding: 24 }}>Đang chuyển về trang thanh toán...</div>;
}
