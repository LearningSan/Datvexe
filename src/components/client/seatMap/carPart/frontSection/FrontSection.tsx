import styles from "./FrontSection.module.css";

export default function FrontSection() {
  return (
    <div className={styles.front}>
      <div className={styles.driver}>
        <div className={styles.driverIcon} />
        <span>TÀI XẾ</span>
      </div>

      <div className={styles.divider} />

      <div className={styles.door}>
        <span>CỬA LÊN</span>
        <div className={styles.doorArrow}>▼</div>
      </div>
    </div>
  );
}
