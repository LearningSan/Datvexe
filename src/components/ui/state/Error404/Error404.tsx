import styles from "./Error404.module.css";

export default function Error404() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <h1 className={styles.title}>404</h1>

        <h2 className={styles.subtitle}>
          Không tìm thấy trang
        </h2>

        <p className={styles.desc}>
          Trang bạn đang tìm không tồn tại hoặc đã bị xoá.
        </p>

        <a href="/" className={styles.btn}>
          Về trang chủ
        </a>

        <a href="client/trips" className={styles.secondaryBtn}>
          Xem chuyến xe
        </a>
      </div>
    </div>
  );
}