import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArrowLeft, CalendarDays } from "lucide-react";

import { NEWS_ITEMS } from "@/constants/news.data";

interface Props {
  params: Promise<{
    slug: string;
  }>;
}

export default async function NewsDetailPage({ params }: Props) {
  const { slug } = await params;

  const news = NEWS_ITEMS.find((item) => item.slug === slug);

  if (!news) {
    notFound();
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "60px 20px",
        background: "#f7f9fc",
      }}
    >
      <article
        style={{
          width: "min(850px, 100%)",
          margin: "0 auto",
          padding: "32px",
          borderRadius: "22px",
          background: "#ffffff",
        }}
      >
        <Link
          href="/news"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "24px",
            color: "#0f766e",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          <ArrowLeft size={18} />
          Quay lại tin tức
        </Link>

        <span
          style={{
            display: "inline-flex",
            padding: "7px 11px",
            borderRadius: "999px",
            color: "#0f766e",
            background: "#ccfbf1",
            fontSize: "12px",
            fontWeight: 800,
          }}
        >
          {news.category}
        </span>

        <h1
          style={{
            margin: "18px 0 12px",
            color: "#16352c",
            fontSize: "40px",
            lineHeight: 1.25,
          }}
        >
          {news.title}
        </h1>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "28px",
            color: "#64748b",
          }}
        >
          <CalendarDays size={17} />
          {new Date(news.publishedAt).toLocaleDateString("vi-VN")}
          <span>•</span>
          {news.author}
        </div>

        <div
          style={{
            position: "relative",
            height: "430px",
            overflow: "hidden",
            borderRadius: "18px",
          }}
        >
          <Image
            src={news.imageUrl}
            alt={news.title}
            fill
            priority
            style={{ objectFit: "cover" }}
          />
        </div>

        <div
          style={{
            marginTop: "30px",
            color: "#334155",
            fontSize: "17px",
            lineHeight: 1.9,
            whiteSpace: "pre-line",
          }}
        >
          {news.content}
        </div>
      </article>
    </main>
  );
}
