import type { Metadata } from "next";

import ContactContainer from "@/components/home/Contact/ContactContainer";

export const metadata: Metadata = {
  title: "Liên hệ | XeKhachPT",
  description:
    "Liên hệ tổng đài chăm sóc khách hàng, gửi phản hồi và tìm văn phòng XeKhachPT.",
};

export default function ContactPage() {
  return <ContactContainer />;
}