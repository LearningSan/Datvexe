import styles from "./RiskCenter.module.css";
import { AlertTriangle, ShieldCheck } from "lucide-react";

export default function RiskCenter({
  data,
}: {
  data: {
    type: string;
    title: string;
    description: string;
    severity: "LOW" | "MEDIUM" | "HIGH";
  }[];
}) {
  if (data.length === 0) {
    return (
      <div className={styles.noRisk}>
        <ShieldCheck size={24} className={styles.safeIcon} />
        <div>
          <strong>Hệ thống an toàn</strong>
          <p>Không ghi nhận rủi ro vận hành nghiêm trọng.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.riskList}>
      {data.map((risk, index) => (
        <div
          key={`risk-${risk.type}-${index}`}
          className={`${styles.riskItem} ${styles[`risk${risk.severity}`]}`}
        >
          <AlertTriangle size={18} className={styles.riskIcon} />

          <div>
            <strong>{risk.title}</strong>
            <p>{risk.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
