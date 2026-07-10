"use client";

import React from "react";
import styles from "./PopularRoutes.module.css";
import { formatCurrency } from "@/lib/client/helpers";

type Props = {
  data: any[];
  onSelectRoute?: (route: any) => void;
};

function RouteSkeleton() {
  return (
    <div className={styles.cardSkeleton}>
      <div className={styles.imageSkeleton} />
      <div className={styles.lineSkeleton} />
      <div className={styles.lineSkeletonSmall} />
    </div>
  );
}

export default function PopularRoutes({ data, onSelectRoute }: Props) {
  if (!data) return null;

  if (!data.length) {
    return (
      <section className={styles.routesSection}>
        <div className={styles.routesInner}>
          <div className={styles.sectionTitleBox}>
            <h2>Tuyến xe phổ biến Nam Bộ</h2>
          </div>

          <div className={styles.routesGrid}>
            {Array.from({ length: 6 }).map((_, i) => (
              <RouteSkeleton key={i} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.routesSection}>
      <div className={styles.routesInner}>
        <div className={styles.sectionTitleBox}>
          <h2>Tuyến xe phổ biến Nam Bộ</h2>
        </div>

        <div className={styles.routesGrid}>
          {data.map((route) => {
            const isHot = route.distance_km > 200;

            return (
              <div
                key={route.route_id}
                className={styles.card}
                onClick={() => onSelectRoute?.(route)}
              >
                {isHot && <div className={styles.badge}>HOT</div>}

                <div className={styles.cardImage}>
                  <img
                    src={route.destination_image_url || "/images/default.png"}
                    alt={route.destination_city}
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src = "/images/default.png";
                    }}
                  />
                </div>

                <div className={styles.cardHeader}>
                  <span>Phương Trang</span>

                  <span className={styles.price}>
                    {formatCurrency(route.base_price)}đ
                  </span>
                </div>

                <h3>
                  {route.origin_city} ➔ {route.destination_city}
                </h3>

                <div className={styles.cardFooter}>
                  <span>{route.distance_km} km</span>
                  <span>{route.estimated_duration} phút</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
} 
