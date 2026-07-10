import styles from "./Error401.module.css";

export default function Error401() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <h1 className={styles.title}>401</h1>

        <h2 className={styles.subtitle}>
          Chưa đăng nhập hoặc hết phiên
        </h2>

        <p className={styles.desc}>
          Bạn cần đăng nhập để truy cập trang này. Phiên đăng nhập có thể đã hết hạn.
        </p>

        <div className={styles.actions}>
          <a href="/login" className={styles.btn}>
            Đăng nhập
          </a>

          <a href="/" className={styles.secondaryBtn}>
            Về trang chủ
          </a>
        </div>
      </div>
    </div>
  );
}