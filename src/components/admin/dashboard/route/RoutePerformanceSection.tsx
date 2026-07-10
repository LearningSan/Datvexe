import { useState } from "react";
import styles from "./RoutePerformanceSection.module.css";
import { useCities } from "@/hooks/client/useRoute";
import { useRoutePerformance } from "@/hooks/client/useDashboard";
import Card from "../card/Card";
import { formatDateTime, formatMoney } from "../utils/dashboardFormat";

export default function RoutePerformanceSection({
  fromDate,
  toDate,
}: {
  fromDate: string;
  toDate: string;
}) {
  const { data: cities } = useCities();

  const [originCityId, setOriginCityId] = useState<number | null>(null);
  const [destinationCityId, setDestinationCityId] = useState<number | null>(
    null,
  );

  const { data, isLoading } = useRoutePerformance({
    originCityId,
    destinationCityId,
    fromDate,
    toDate,
  });

  return (
    <section className={styles.routePerformanceSection}>
      <Card title="Tra cứu hiệu suất tuyến bất kỳ">
        <div className={styles.routeFilter}>
          <select
            value={originCityId ?? ""}
            onChange={(e) => setOriginCityId(Number(e.target.value) || null)}
          >
            <option value="">Chọn điểm đi</option>
            {(cities ?? []).map((city: any) => (
              <option key={`origin-${city.city_id}`} value={city.city_id}>
                {city.city_name}
              </option>
            ))}
          </select>

          <select
            value={destinationCityId ?? ""}
            onChange={(e) =>
              setDestinationCityId(Number(e.target.value) || null)
            }
          >
            <option value="">Chọn điểm đến</option>
            {(cities ?? []).map((city: any) => (
              <option key={`destination-${city.city_id}`} value={city.city_id}>
                {city.city_name}
              </option>
            ))}
          </select>
        </div>

        {!originCityId || !destinationCityId ? (
          <div className={styles.emptyBox}>
            Chọn điểm đi và điểm đến để xem hiệu suất từng chuyến.
          </div>
        ) : originCityId === destinationCityId ? (
          <div className={styles.emptyBox}>
            Điểm đi và điểm đến không được trùng nhau.
          </div>
        ) : isLoading ? (
          <div className={styles.emptyBox}>Đang tải hiệu suất tuyến...</div>
        ) : !data ? (
          <div className={styles.emptyBox}>Không có dữ liệu tuyến.</div>
        ) : (
          <>
            <div className={styles.routeSummaryGrid}>
              <div>
                <span>Tuyến</span>
                <strong>{data.summary.routeName}</strong>
              </div>

              <div>
                <span>Tổng chuyến</span>
                <strong>{data.summary.totalTrips}</strong>
              </div>

              <div>
                <span>Vé đã đặt</span>
                <strong>{data.summary.totalBookedSeats}</strong>
              </div>

              <div>
                <span>Doanh thu</span>
                <strong>{formatMoney(data.summary.revenue)}</strong>
              </div>

              <div>
                <span>Lấp đầy</span>
                <strong>{data.summary.occupancyRate}%</strong>
              </div>
            </div>

            <div className={styles.tripPerformanceList}>
              {data.trips.map((trip) => (
                <div
                  className={styles.tripPerformanceItem}
                  key={`route-trip-${trip.tripId}`}
                >
                  <div className={styles.tripPerformanceHeader}>
                    <strong>{formatDateTime(trip.departureTime)}</strong>
                    <span>
                      {trip.bookedSeats}/{trip.totalSeats} ghế ·{" "}
                      {trip.occupancyRate}%
                    </span>
                  </div>

                  <div className={styles.barTrack}>
                    <div
                      className={styles.barFill}
                      style={{
                        width: `${Math.min(Number(trip.occupancyRate || 0), 100)}%`,
                      }}
                    />
                  </div>

                  <div className={styles.routeMeta}>
                    Doanh thu: {formatMoney(trip.revenue)}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </section>
  );
}
