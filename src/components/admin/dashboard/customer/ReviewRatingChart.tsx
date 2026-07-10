import styles from "../shared/ChartList.module.css";
export default function ReviewRatingChart({
  data,
}: {
  data: {
    rating: number;
    count: number;
  }[];
}) {
  if (data.length === 0) {
    return <div className={styles.emptyBox}>Chưa có đánh giá</div>;
  }

  const max = Math.max(...data.map((item) => Number(item.count || 0)), 1);

  return (
    <div className={styles.chartList}>
      {data.map((item) => (
        <div key={`rating-${item.rating}`} className={styles.chartRowItem}>
          <div className={styles.chartRowHeader}>
            <span>{item.rating} sao</span>
            <strong>{item.count}</strong>
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
