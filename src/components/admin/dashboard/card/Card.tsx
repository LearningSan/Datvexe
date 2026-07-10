import React from "react";
import styles from "./Card.module.css";
export default function Card({
  title,
  children,
  variant = "default",
}: {
  title: string;
  children: React.ReactNode;
  variant?: string;
}) {
  const variantClass = styles[`card_${variant}`] || "";

  return (
    <div className={`${styles.card} ${variantClass}`}>
      <h3>{title}</h3>
      <div className={styles.cardContent}>{children}</div>
    </div>
  );
}
