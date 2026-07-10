import styles from "../shared/ChartList.module.css";
import { formatMoney } from "../utils/dashboardFormat";
export default function PaymentMethodChart({
  data,
}: {
  data: {
    method: string;
    transactionCount: number;
    revenue: number;
  }[];
}) {
  if (data.length === 0) {
    return <div className={styles.emptyBox}>Chưa có dữ liệu thanh toán</div>;
  }

  const total = data.reduce((sum, item) => sum + Number(item.revenue || 0), 0);

  return (
    <div className={styles.chartList}>
      {data.map((item, index) => {
        const percent =
          total > 0 ? (Number(item.revenue || 0) / total) * 100 : 0;

        return (
          <div
            key={`method-${item.method}-${index}`}
            className={styles.chartRowItem}
          >
            <div className={styles.chartRowHeader}>
              <span>{item.method}</span>
              <strong>{formatMoney(item.revenue)}</strong>
            </div>

            <div className={styles.barTrack}>
              <div
                className={styles.barFill}
                style={{ width: `${Math.min(percent, 100)}%` }}
              />
            </div>

            <div className={styles.routeMeta}>
              {item.transactionCount} giao dịch · {percent.toFixed(1)}%
            </div>
          </div>
        );
      })}
    </div>
  );
}
