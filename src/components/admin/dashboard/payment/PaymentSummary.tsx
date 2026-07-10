import styles from "./PaymentSummary.module.css";
export default function PaymentSummary({
  data,
}: {
  data: {
    method: string;
    paid: number;
    pending: number;
    failed: number;
    refunded: number;
  }[];
}) {
  if (data.length === 0) {
    return <div className={styles.emptyBox}>Chưa có giao dịch thanh toán</div>;
  }

  return (
    <div className={styles.paymentList}>
      {data.map((item, index) => {
        const total =
          Number(item.paid || 0) +
            Number(item.pending || 0) +
            Number(item.failed || 0) +
            Number(item.refunded || 0) || 1;

        return (
          <div
            className={styles.paymentItem}
            key={`payment-${item.method}-${index}`}
          >
            <div className={styles.paymentHeader}>
              <strong>{item.method}</strong>
              <span className={styles.transactionCount}>{total} giao dịch</span>
            </div>

            <div className={styles.paymentProgress}>
              <div
                className={styles.paidPart}
                style={{ width: `${(Number(item.paid || 0) / total) * 100}%` }}
              />

              <div
                className={styles.pendingPart}
                style={{
                  width: `${(Number(item.pending || 0) / total) * 100}%`,
                }}
              />

              <div
                className={styles.failedPart}
                style={{
                  width: `${(Number(item.failed || 0) / total) * 100}%`,
                }}
              />

              <div
                className={styles.refundedPart}
                style={{
                  width: `${(Number(item.refunded || 0) / total) * 100}%`,
                }}
              />
            </div>

            <div className={styles.paymentMeta}>
              <span className={styles.metaPaid}>Thành công ({item.paid})</span>
              <span className={styles.metaPending}>Chờ ({item.pending})</span>
              <span className={styles.metaFailed}>Lỗi ({item.failed})</span>
              <span className={styles.metaRefund}>Hoàn ({item.refunded})</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
