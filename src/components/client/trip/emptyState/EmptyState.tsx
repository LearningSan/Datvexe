import styles from "./EmptyState.module.css";

export default function EmptyState() {
  return (
    <div className={styles.box}>
      Không tìm thấy chuyến xe nào
    </div>
  );
}