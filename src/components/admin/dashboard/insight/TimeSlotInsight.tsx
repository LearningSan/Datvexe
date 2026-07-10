import styles from "../shared/ChartList.module.css";
export default function TimeSlotInsight({
  data,
}: {
  data: {
    timeSlot: string;
    totalTrips: number;
    bookedSeats: number;
    totalSeats: number;
    occupancyRate: number;
    recommendation: string;
  }[];
}) {
  if (data.length === 0) {
    return <div className={styles.emptyBox}>Chưa có dữ liệu khung giờ</div>;
  }

  return (
    <div className={styles.chartList}>
      {data.map((item, index) => (
        <div key={`slot-insight-${item.timeSlot}-${index}`}>
          <div className={styles.chartRowHeader}>
            <span>{item.timeSlot}</span>
            <strong>{item.occupancyRate}%</strong>
          </div>

          <div className={styles.barTrack}>
            <div
              className={styles.barFill}
              style={{
                width: `${Math.min(Number(item.occupancyRate || 0), 100)}%`,
              }}
            />
          </div>

          <div className={styles.routeMeta}>
            {item.bookedSeats}/{item.totalSeats} ghế · {item.totalTrips} chuyến
          </div>

          <div className={styles.insightNote}>{item.recommendation}</div>
        </div>
      ))}
    </div>
  );
}
