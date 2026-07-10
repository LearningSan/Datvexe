import styles from "./CarFrame.module.css";
import Wheel from "../wheel/Wheel";
import FrontSection from "../frontSection/FrontSection";

interface Props {
  children: React.ReactNode;
  width?: number; // optional auto scale
}

export default function CarFrame({ children, width }: Props) {
  return (
    <div
      className={styles.busFrame}
      style={width ? { width } : undefined}
    >
      <Wheel />

      <div className={styles.inner}>
        <div className={styles.content}>{children}</div>
        <FrontSection />
      </div>
    </div>
  );
}