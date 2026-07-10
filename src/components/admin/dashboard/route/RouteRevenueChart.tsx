import styles from "../shared/ChartList.module.css";
import { formatMoney } from "../utils/dashboardFormat";
export default function RouteRevenueChart({
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
    return <div className={styles.emptyBox}>Chưa có dữ liệu tuyến</div>;
  }

  const max = Math.max(...data.map((item) => Number(item.revenue || 0)), 1);

  return (
    <div className={styles.chartList}>
      {data.map((item, index) => (
        <div
          key={`route-revenue-${item.routeId}-${index}`}
          className={styles.chartRowItem}
        >
          <div className={styles.chartRowHeader}>
            <span>{item.routeName}</span>
            <strong>{formatMoney(item.revenue)}</strong>
          </div>

          <div className={styles.barTrack}>
            <div
              className={styles.barFill}
              style={{
                width: `${(Number(item.revenue || 0) / max) * 100}%`,
              }}
            />
          </div>

          <div className={styles.routeMeta}>
            {item.ticketsSold} vé · Lấp đầy {item.occupancyRate}%
          </div>
        </div>
      ))}
    </div>
  );
}
