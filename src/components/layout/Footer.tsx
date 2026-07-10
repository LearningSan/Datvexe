import styles from "./layout.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        {/* COLUMN 1 - ABOUT */}
        <div className={styles.col}>
          <h3 className={styles.title}>XeKhachPT</h3>
          <p className={styles.text}>
            Hệ thống đặt vé xe khách khu vực Nam Bộ. Mô phỏng theo mô hình vận
            hành Phương Trang.
          </p>
        </div>

        {/* COLUMN 2 - SUPPORT */}
        <div className={styles.col}>
          <h3 className={styles.title}>Hỗ trợ</h3>
          <a href="#" className={styles.link}>
            Câu hỏi thường gặp
          </a>
          <a href="#" className={styles.link}>
            Chính sách hoàn vé
          </a>
          <a href="#" className={styles.link}>
            Điều khoản sử dụng
          </a>
        </div>

        {/* COLUMN 3 - CONTACT */}
        <div className={styles.col}>
          <h3 className={styles.title}>Liên hệ</h3>

          <div className={styles.contactItem}>📞 Hotline: 1900 xxxx</div>
          <div className={styles.contactItem}>💬 Zalo: XeKhachPT Support</div>
          <div className={styles.contactItem}>📧 support@xekhachpt.vn</div>

          {/* SOCIAL ICONS */}
          <div className={styles.socials}>
            <a href="#" className={styles.icon}>
              📘 Facebook
            </a>
            <a href="#" className={styles.icon}>
              💬 Zalo
            </a>
            <a href="#" className={styles.icon}>
              📞 Call
            </a>
          </div>
        </div>
      </div>

      {/* BOTTOM */}
      <div className={styles.bottom}>
        © {new Date().getFullYear()} XeKhachPT. All rights reserved.
      </div>
    </footer>
  );
}
