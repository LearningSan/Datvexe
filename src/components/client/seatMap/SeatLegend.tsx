import styles
from "./SeatContainer.module.css";

export default function SeatLegend() {

  return (
    <div className={styles.legendContainer}>
      <h3 className={styles.legendTitle}>
        TRẠNG THÁI GHẾ
      </h3>

      <div className={styles.legendList}>

        <div className={styles.legendItem}>
          <div className={`${styles.statusBox} ${styles.available}`}></div>
          <span>Còn trống</span>
        </div>

        <div className={styles.legendItem}>
          <div className={`${styles.statusBox} ${styles.selected}`}></div>
          <span>Đang chọn</span>
        </div>

        <div className={styles.legendItem}>
          <div className={`${styles.statusBox} ${styles.holding}`}></div>
          <span>Đang giữ</span>
        </div>

        <div className={styles.legendItem}>
          <div className={`${styles.statusBox} ${styles.booked}`}></div>
          <span>Đã đặt</span>
        </div>

      </div>
    </div>
  );
}