import styles from "./RevenueChart.module.css";
import {
  formatAxisMoney,
  formatChartDate,
  formatCompactMoney,
} from "../utils/dashboardFormat";
export default function RevenueChart({
  data,
}: {
  data: {
    date: string;
    grossRevenue: number;
    refundedAmount: number;
    netRevenue: number;
  }[];
}) {
  if (data.length === 0) {
    return <div className={styles.emptyBox}>Chưa có dữ liệu doanh thu</div>;
  }

  const max = Math.max(
    ...data.map((item) => Number(item.grossRevenue || 0)),
    1,
  );
  const CHART_BAR_HEIGHT = 210;

  const yLabels = [max, max * 0.75, max * 0.5, max * 0.25, 0];
  return (
    <div className={styles.chartContainer}>
      <div className={styles.chartUnit}>Đơn vị: rút gọn</div>{" "}
      <div className={styles.chartWrapper}>
        <div className={styles.yAxis}>
          {yLabels.map((label) => (
            <span key={label}>{formatAxisMoney(label)}</span>
          ))}
        </div>
        <div className={styles.chart}>
          {data.map((item, index) => (
            <div
              className={styles.chartCol}
              key={`revenue-${item.date}-${index}`}
            >
              <div className={styles.chartBars}>
                <div className={styles.barGroup}>
                  <div className={styles.chartTooltip}>
                    <div>Tổng: {formatCompactMoney(item.grossRevenue)}</div>
                    <div>Hoàn: {formatCompactMoney(item.refundedAmount)}</div>
                    <div className={styles.tooltipNet}>
                      Thuần: {formatCompactMoney(item.netRevenue)}
                    </div>
                  </div>

                  <div
                    className={styles.grossBar}
                    style={{
                      height: `${Math.max(
                        (Number(item.grossRevenue || 0) / max) *
                          CHART_BAR_HEIGHT,
                        6,
                      )}px`,
                    }}
                  />

                  <div
                    className={styles.refundBar}
                    style={{
                      height: `${Math.max(
                        (Number(item.refundedAmount || 0) / max) *
                          CHART_BAR_HEIGHT,
                        3,
                      )}px`,
                    }}
                  />
                </div>
              </div>

              <small className={styles.chartDate}>
                {formatChartDate(item.date)}
              </small>
            </div>
          ))}
        </div>
      </div>
      <div className={styles.chartLegend}>
        <span className={styles.legendGross}>● Doanh thu tổng</span>
        <span className={styles.legendRefund}>● Hoàn tiền</span>
      </div>
    </div>
  );
}
