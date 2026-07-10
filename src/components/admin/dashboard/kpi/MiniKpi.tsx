import styles from "./MiniKpi.module.css";
export default function MiniKpi({
  title,
  value,
  type,
}: {
  title: string;
  value: string | number | null | undefined;
  type: string;
}) {
  return (
    <div className={`${styles.miniKpi} ${styles[type]}`}>
      <span>{title}</span>
      <strong>{value ?? 0}</strong>
    </div>
  );
}
