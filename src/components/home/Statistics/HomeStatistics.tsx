"use client";

import { HOME_STATISTICS } from "@/constants/home-statistics";
import styles from "./HomeStatistics.module.css";

export default function HomeStatistics() {
  return (
    <section className={styles.statisticsSection}>
      {/* Tiêu đề chính căn giữa */}
      <div className={styles.header}>
        <h2 className={styles.mainTitle}>
          XE KHACH PT - CHẤT LƯỢNG LÀ DANH DỰ
        </h2>
        <p className={styles.subTitle}>Được khách hàng tin tưởng và lựa chọn</p>
      </div>

      {/* Bố cục nội dung chính bên dưới */}
      <div className={styles.contentLayout}>
        {/* Cột bên trái: Danh sách các dòng thống kê */}
        <div className={styles.statsLeft}>
          {HOME_STATISTICS.map((item, index) => (
            <div key={index} className={styles.statRow}>
              <div className={styles.iconWrapper}>
                <img
                  src={item.icon}
                  alt={item.title}
                  className={styles.statIcon}
                />
              </div>
              <div className={styles.statInfo}>
                <div className={styles.titleLine}>
                  <span className={styles.value}>{item.value}</span>
                  <span className={styles.title}>{item.title}</span>
                </div>
                <p className={styles.description}>{item.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Cột bên phải: Hình minh họa lớn */}
        <div className={styles.statsRight}>
          <img
            src="/images/travel-illustration.png" // Thay bằng ảnh vector nam nữ ngồi xem bản đồ
            alt="Futa Travel Illustration"
            className={styles.illustrationImage}
          />
        </div>
      </div>
    </section>
  );
}
