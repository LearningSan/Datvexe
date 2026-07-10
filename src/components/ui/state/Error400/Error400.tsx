import styles from "./Error400.module.css";

export default function Error400() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.box}>
        <div className={styles.icon}>⚠️</div>

        <h1 className={styles.title}>400</h1>
        <h2 className={styles.subtitle}>Yêu cầu không hợp lệ</h2>

        <p className={styles.desc}>
          Dữ liệu gửi lên không đúng định dạng hoặc thiếu thông tin.
        </p>

        <a href="/" className={styles.btn}>
          Quay về trang chủ
        </a>
      </div>
    </div>
  );
}