import styles from "../shared/ChartList.module.css";
export default function TripStatusChart({
  data,
}: {
  data: {
    status: string;
    count: number;
  }[];
}) {
  if (data.length === 0) {
    return <div className={styles.emptyBox}>Chưa có dữ liệu chuyến xe</div>;
  }

  const max = Math.max(...data.map((item) => Number(item.count || 0)), 1);

  return (
    <div className={styles.chartList}>
      {data.map((item, index) => (
        <div
          key={`trip-status-${item.status}-${index}`}
          className={styles.chartRowItem}
        >
          <div className={styles.chartRowHeader}>
            <span>{item.status}</span>
            <strong>{item.count} chuyến</strong>
          </div>

          <div className={styles.barTrack}>
            <div
              className={styles.barFill}
              style={{
                width: `${(Number(item.count || 0) / max) * 100}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
