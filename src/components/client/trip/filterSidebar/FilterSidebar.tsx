"use client";

import styles from "./FilterSidebar.module.css";

import type {
  SortField,
  TripSearchFilters,
} from "@/types/client/trip/trip-filter.type";

interface FilterOptionItem {
  label: string;
  value: string;
}

interface FilterOptions {
  timeSlots: FilterOptionItem[];
}

interface Props {
  filters: TripSearchFilters;
  filterOptions?: FilterOptions;

  openSort: "price" | "departure" | null;

  setOpenSort: React.Dispatch<
    React.SetStateAction<"price" | "departure" | null>
  >;

  toggleArray: (key: keyof TripSearchFilters, value: string) => void;
  handleOnlyAvailable: (checked: boolean) => void;
  handleSort: (field: SortField, order: "asc" | "desc") => void;
  resetFilters: () => void;
}

export default function FilterSidebar({
  filters,
  filterOptions,
  openSort,
  setOpenSort,
  toggleArray,
  handleOnlyAvailable,
  handleSort,
  resetFilters,
}: Props) {
  const timeSlotOptions = filterOptions?.timeSlots ?? [];
  return (
    <div className={styles.box}>
      <div className={styles.header}>
        <h3>Bộ lọc tìm kiếm</h3>

        <button onClick={resetFilters} className={styles.resetBtn}>
          Bỏ lọc ✕
        </button>
      </div>

      {/* TÌNH TRẠNG GHẾ */}
      <div className={styles.section}>
        <label className={styles.title}>Tình trạng ghế</label>

        <div className={styles.checkboxRow}>
          <input
            type="checkbox"
            className={styles.input}
            checked={filters.onlyAvailable}
            onChange={(e) => handleOnlyAvailable(e.target.checked)}
          />

          <span>Chỉ hiển thị chuyến còn ghế</span>
        </div>
      </div>

      {/* GIỜ ĐI */}
      <div className={styles.section}>
        <label className={styles.title}>Giờ đi</label>

        <div className={styles.group}>
          {timeSlotOptions.length === 0 ? (
            <p className={styles.emptyText}>Không có khung giờ phù hợp</p>
          ) : (
            timeSlotOptions.map((item) => (
              <label key={item.value}>
                <input
                  type="checkbox"
                  className={styles.input}
                  checked={filters.timeSlots.includes(item.value)}
                  onChange={() => toggleArray("timeSlots", item.value)}
                />
                {item.label}
              </label>
            ))
          )}
        </div>
      </div>

      {/* LOẠI XE */}
      <div className={styles.section}>
        <label className={styles.title}>Loại xe</label>

        <div className={styles.buttonGrid}>
          {[
            "Limousine 9 chỗ",
            "Limousine 19 chỗ",
            "Giường nằm 40 chỗ",
            "Cabin VIP 22 phòng",
          ].map((type) => (
            <button
              key={type}
              type="button"
              className={`${styles.tagBtn} ${
                filters.vehicleTypes.includes(type) ? styles.active : ""
              }`}
              onClick={() => toggleArray("vehicleTypes", type)}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* HÀNG GHẾ */}
      <div className={styles.section}>
        <label className={styles.title}>Hàng ghế</label>

        <div className={styles.buttonGroup}>
          {["Hàng đầu", "Hàng giữa", "Hàng cuối"].map((row) => (
            <button
              key={row}
              type="button"
              className={`${styles.tagBtn} ${
                filters.seatPositions.includes(row) ? styles.active : ""
              }`}
              onClick={() => toggleArray("seatPositions", row)}
            >
              {row}
            </button>
          ))}
        </div>
      </div>

      {/* TẦNG */}
      <div className={styles.section}>
        <label className={styles.title}>Tầng</label>

        <div className={styles.buttonGroup}>
          {["Tầng trên", "Tầng dưới"].map((floor) => (
            <button
              key={floor}
              type="button"
              className={`${styles.tagBtn} ${
                filters.floors.includes(floor) ? styles.active : ""
              }`}
              onClick={() => toggleArray("floors", floor)}
            >
              {floor}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <label className={styles.title}>Sắp xếp kết quả</label>

        <div className={styles.sortRow}>
          {/* PRICE */}
          <div className={styles.sortBox}>
            <button
              type="button"
              className={`${styles.tagBtn} ${filters.sort.field === "price" ? styles.active : ""}`}
              onClick={() => setOpenSort(openSort === "price" ? null : "price")}
            >
              Giá vé
              {filters.sort.field === "price"
                ? filters.sort.order === "asc"
                  ? " ↑"
                  : " ↓"
                : " ▾"}
            </button>

            {openSort === "price" && (
              <div className={styles.sortMenu}>
                <div
                  className={styles.sortItem}
                  onClick={() => handleSort("price", "asc")}
                >
                  Tăng dần ↑
                </div>
                <div
                  className={styles.sortItem}
                  onClick={() => handleSort("price", "desc")}
                >
                  Giảm dần ↓
                </div>
              </div>
            )}
          </div>

          {/* DEPARTURE */}
          <div className={styles.sortBox}>
            <button
              type="button"
              className={`${styles.tagBtn} ${filters.sort.field === "departure" ? styles.active : ""}`}
              onClick={() =>
                setOpenSort(openSort === "departure" ? null : "departure")
              }
            >
              Giờ chạy
              {filters.sort.field === "departure"
                ? filters.sort.order === "asc"
                  ? " ↑"
                  : " ↓"
                : " ▾"}
            </button>

            {openSort === "departure" && (
              <div className={styles.sortMenu}>
                <div
                  className={styles.sortItem}
                  onClick={() => handleSort("departure", "asc")}
                >
                  Sớm nhất ↑
                </div>
                <div
                  className={styles.sortItem}
                  onClick={() => handleSort("departure", "desc")}
                >
                  Muộn nhất ↓
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
