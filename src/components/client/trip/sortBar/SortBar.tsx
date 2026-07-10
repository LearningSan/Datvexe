import styles from "./SortBar.module.css";

export default function SortBar({ filters, setFilters }: any) {
  return (
    <div className={styles.bar}>
      <select
        value={filters.sort}
        onChange={(e) =>
          setFilters({
            ...filters,
            sort: e.target.value,
          })
        }
      >
        <option value="price_asc">Giá tăng dần</option>
        <option value="price_desc">Giá giảm dần</option>
        <option value="time">Giờ khởi hành</option>
      </select>
    </div>
  );
}