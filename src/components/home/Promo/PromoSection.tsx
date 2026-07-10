"use client";

import { useEffect, useState } from "react";
import styles from "./PromoSection.module.css";
import { Promotion } from "@/types/client/promotion/promotion.type";

type Props = {
  promotionsList: Promotion[];
};

const DEFAULT_PROMO_BANNER = "/images/default-promo.png";

export default function PromoSection({ promotionsList }: Props) {
  const [index, setIndex] = useState(0);
  const [maxVisible, setMaxVisible] = useState(3);

  const canSlide = promotionsList.length > maxVisible;
  const handlePrev = () => {
    setIndex((prev) =>
      prev === 0 ? Math.max(0, promotionsList.length - maxVisible) : prev - 1,
    );
  };

  const handleNext = () => {
    setIndex((prev) =>
      prev >= promotionsList.length - maxVisible ? 0 : prev + 1,
    );
  };
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) setMaxVisible(1);
      else if (window.innerWidth < 1024) setMaxVisible(2);
      else setMaxVisible(3);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!canSlide) {
      setIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setIndex((prev) =>
        prev >= promotionsList.length - maxVisible ? 0 : prev + 1,
      );
    }, 3500);

    return () => clearInterval(interval);
  }, [canSlide, promotionsList.length, maxVisible]);

  if (!promotionsList.length) return null;

  return (
    <section className={styles.promoSection}>
      <div className={styles.header}>🎁 Khuyến mãi đặc biệt</div>

      <div className={styles.promoWrapper}>
        {canSlide && (
          <>
            <button
              type="button"
              className={`${styles.navBtn} ${styles.prevBtn}`}
              onClick={handlePrev}
            >
              ‹
            </button>

            <button
              type="button"
              className={`${styles.navBtn} ${styles.nextBtn}`}
              onClick={handleNext}
            >
              ›
            </button>
          </>
        )}

        <div
          className={styles.promoTrack}
          style={{
            transform: `translateX(-${index * (100 / maxVisible)}%)`,
          }}
        >
          {promotionsList.map((promo) => (
            <div
              key={promo.promotion_id}
              className={styles.promoItem}
              style={{
                flex: `0 0 ${100 / maxVisible}%`,
              }}
            >
              <div className={styles.promoCard}>
                <img
                  src={promo.banner_url || DEFAULT_PROMO_BANNER}
                  alt={promo.promotion_name}
                  className={styles.bannerImage}
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.src = DEFAULT_PROMO_BANNER;
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
