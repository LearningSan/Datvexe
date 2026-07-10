import styles from "./Error403.module.css";

export default function Error403() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <h1 className={styles.title}>403</h1>

        <h2 className={styles.subtitle}>
          Không có quyền truy cập
        </h2>

        <p className={styles.desc}>
          Bạn không có quyền xem trang này. Vui lòng liên hệ quản trị viên nếu bạn nghĩ đây là lỗi.
        </p>

        <a href="/" className={styles.btn}>
          Về trang chủ
        </a>
      </div>
    </div>
  );
}