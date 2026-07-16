"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { ArrowRight, CalendarDays, Newspaper, Search } from "lucide-react";

import { NEWS_ITEMS } from "@/constants/news.data";

import styles from "./NewsContainer.module.css";

export default function NewsContainer() {
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("Tất cả");

  const categories = useMemo(() => {
    return [
      "Tất cả",
      ...Array.from(new Set(NEWS_ITEMS.map((item) => item.category))),
    ];
  }, []);

  const filteredNews = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return NEWS_ITEMS.filter((item) => {
      const matchesCategory =
        category === "Tất cả" || item.category === category;

      const matchesKeyword =
        !normalizedKeyword ||
        item.title.toLowerCase().includes(normalizedKeyword) ||
        item.excerpt.toLowerCase().includes(normalizedKeyword);

      return matchesCategory && matchesKeyword;
    });
  }, [keyword, category]);

  const featuredNews =
    filteredNews.find((item) => item.featured) ?? filteredNews[0];

  const remainingNews = filteredNews.filter(
    (item) => item.id !== featuredNews?.id,
  );

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroIcon}>
            <Newspaper size={28} />
          </div>

          <span className={styles.eyebrow}>Tin tức và cẩm nang</span>

          <h1>Đồng hành cùng bạn trên mọi hành trình</h1>

          <p>
            Cập nhật thông tin, chính sách, hướng dẫn đặt vé và những kinh
            nghiệm hữu ích khi di chuyển bằng xe khách.
          </p>
        </div>
      </section>

      <section className={styles.content}>
        <div className={styles.toolbar}>
          <div className={styles.searchBox}>
            <Search size={19} />

            <input
              value={keyword}
              placeholder="Tìm kiếm bài viết..."
              onChange={(event) => setKeyword(event.target.value)}
            />
          </div>

          <div className={styles.categories}>
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                className={`${styles.categoryButton} ${
                  category === item ? styles.categoryActive : ""
                }`}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {!featuredNews ? (
          <div className={styles.emptyState}>
            <Newspaper size={40} />
            <h2>Không tìm thấy bài viết</h2>
            <p>Hãy thử thay đổi từ khóa hoặc danh mục tìm kiếm.</p>
          </div>
        ) : (
          <>
            <article className={styles.featuredCard}>
              <div className={styles.featuredImage}>
                <Image
                  src={featuredNews.imageUrl}
                  alt={featuredNews.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 55vw"
                />
              </div>

              <div className={styles.featuredContent}>
                <span className={styles.categoryBadge}>
                  {featuredNews.category}
                </span>

                <h2>{featuredNews.title}</h2>

                <p>{featuredNews.excerpt}</p>

                <div className={styles.meta}>
                  <span>
                    <CalendarDays size={16} />
                    {new Date(featuredNews.publishedAt).toLocaleDateString(
                      "vi-VN",
                    )}
                  </span>

                  <span>{featuredNews.author}</span>
                </div>

                <Link
                  href={`/news/${featuredNews.slug}`}
                  className={styles.readMore}
                >
                  Đọc bài viết
                  <ArrowRight size={18} />
                </Link>
              </div>
            </article>

            <div className={styles.newsGrid}>
              {remainingNews.map((item) => (
                <article key={item.id} className={styles.newsCard}>
                  <div className={styles.cardImage}>
                    <Image
                      src={item.imageUrl}
                      alt={item.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </div>

                  <div className={styles.cardContent}>
                    <span className={styles.categoryBadge}>
                      {item.category}
                    </span>

                    <h3>{item.title}</h3>

                    <p>{item.excerpt}</p>

                    <div className={styles.meta}>
                      <span>
                        <CalendarDays size={15} />
                        {new Date(item.publishedAt).toLocaleDateString("vi-VN")}
                      </span>
                    </div>

                    <Link
                      href={`/news/${item.slug}`}
                      className={styles.cardLink}
                    >
                      Xem chi tiết
                      <ArrowRight size={17} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
