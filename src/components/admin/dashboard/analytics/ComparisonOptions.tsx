import { useState } from "react";
import styles from "./ComparisonOptions.module.css";
import { formatMoney } from "../utils/dashboardFormat";

export default function ComparisonOptions({
  data,
}: {
  data: {
    metric:
      | "REVENUE"
      | "TICKETS"
      | "BOOKING_SUCCESS"
      | "CANCELLATION"
      | "OCCUPANCY";
    label: string;
    currentValue: number;
    previousValue: number;
    changePercent: number;
  }[];
}) {
  const [selected, setSelected] = useState<
    "REVENUE" | "TICKETS" | "BOOKING_SUCCESS" | "CANCELLATION" | "OCCUPANCY"
  >("REVENUE");

  const current = data.find((item) => item.metric === selected) ?? data[0];

  if (!current) {
    return <div className={styles.emptyBox}>Chưa có dữ liệu so sánh</div>;
  }

  return (
    <div>
      <div className={styles.segmentControl}>
        {data.map((item) => (
          <button
            key={item.metric}
            className={
              selected === item.metric ? styles.activeBtn : styles.quickBtn
            }
            onClick={() => setSelected(item.metric)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div
        className={`${styles.compareLarge} ${
          current.changePercent >= 0 ? styles.compareUp : styles.compareDown
        }`}
      >
        <span>{current.label}</span>

        <strong>
          {current.changePercent >= 0 ? "+" : ""}
          {current.changePercent}%
        </strong>

        <p>
          Kỳ này: {formatCompareValue(current.metric, current.currentValue)} ·
          Kỳ trước: {formatCompareValue(current.metric, current.previousValue)}
        </p>
      </div>
    </div>
  );
}

function formatCompareValue(metric: string, value: number) {
  if (metric === "REVENUE") return formatMoney(value);
  if (metric === "TICKETS") return `${value} vé`;

  return `${value}%`;
}
