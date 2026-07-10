import React from "react";
import styles from "./KpiCard.module.css";
export default function KpiCard({
  icon,
  title,
  value,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  tone: string;
}) {
  return (
    <div className={`${styles.kpiCard} ${styles[tone]}`}>
      <div className={styles.kpiIcon}>{icon}</div>

      <div className={styles.kpiMain}>
        <span className={styles.kpiTitle}>{title}</span>
        <strong className={styles.kpiValue}>{value}</strong>
      </div>
    </div>
  );
}
