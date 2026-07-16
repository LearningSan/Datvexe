import type { Metadata } from "next";

import NewsContainer from "@/components/home/news/NewsContainer";

export const metadata: Metadata = {
  title: "Tin tức | XeKhachPT",
  description:
    "Tin tức, hướng dẫn và kinh nghiệm hữu ích khi đặt vé và đi xe khách.",
};

export default function NewsPage() {
  return <NewsContainer />;
}