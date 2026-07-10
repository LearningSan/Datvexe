import styles from "../shared/ChartList.module.css";
import { formatDateTime, formatMoney } from "../utils/dashboardFormat";
export default function LowPerformanceTrips({
  data,
}: {
  data: {
    tripId: number;
    routeName: string;
    departureTime: string;
    bookedSeats: number;
    totalSeats: number;
    occupancyRate: number;
    revenue: number;
  }[];
}) {
  if (data.length === 0) {
    return (
      <div className={styles.emptyBox}>
        Tất cả các chuyến đạt hiệu suất tốt.
      </div>
    );
  }

  return (
    <div className={styles.chartList}>
      {data.map((trip) => (
        <div key={`low-trip-${trip.tripId}`} className={styles.chartRowItem}>
          <div className={styles.chartRowHeader}>
            <span>
              #{trip.tripId} - {trip.routeName}
            </span>
            <strong className={styles.dangerText}>{trip.occupancyRate}%</strong>
          </div>

          <div className={styles.barTrack}>
            <div
              className={styles.barFillDanger}
              style={{
                width: `${Math.min(Number(trip.occupancyRate || 0), 100)}%`,
              }}
            />
          </div>

          <div className={styles.routeMeta}>
            {formatDateTime(trip.departureTime)} · {trip.bookedSeats}/
            {trip.totalSeats} ghế · {formatMoney(trip.revenue)}
          </div>
        </div>
      ))}
    </div>
  );
}
