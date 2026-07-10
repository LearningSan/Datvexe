import styles from "../shared/ChartList.module.css";
import { formatMoney } from "../utils/dashboardFormat";
export default function RouteSellingChart({
  data,
}: {
  data: {
    routeId: number;
    routeName: string;
    ticketsSold: number;
    revenue: number;
    occupancyRate: number;
  }[];
}) {
  if (data.length === 0) {
    return (
      <div className={styles.emptyBox}>Chưa có dữ liệu tuyến bán chạy</div>
    );
  }

  const max = Math.max(...data.map((item) => Number(item.ticketsSold || 0)), 1);

  return (
    <div className={styles.chartList}>
      {data.map((item, index) => (
        <div
          key={`route-selling-${item.routeId}-${index}`}
          className={styles.chartRowItem}
        >
          <div className={styles.chartRowHeader}>
            <span>{item.routeName}</span>
            <strong>{item.ticketsSold} vé</strong>
          </div>

          <div className={styles.barTrack}>
            <div
              className={styles.barFill}
              style={{
                width: `${(Number(item.ticketsSold || 0) / max) * 100}%`,
              }}
            />
          </div>

          <div className={styles.routeMeta}>
            {formatMoney(item.revenue)} · Lấp đầy {item.occupancyRate}%
          </div>
        </div>
      ))}
    </div>
  );
}
