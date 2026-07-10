import styles from "./Wheel.module.css";

export default function Wheel() {
  return (
    <>
      <div className={`${styles.wheel} ${styles.topLeft}`} />
      <div className={`${styles.wheel} ${styles.topRight}`} />
      <div className={`${styles.wheel} ${styles.bottomLeft}`} />
      <div className={`${styles.wheel} ${styles.bottomRight}`} />
    </>
  );
}