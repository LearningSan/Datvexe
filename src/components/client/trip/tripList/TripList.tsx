import TripCard from "../tripCart/TripCard";
import TripCardSkeleton from "../tripCartSkeleton/TripCardSkeleton";
import EmptyState from "../emptyState/EmptyState";
import styles from "./TripList.module.css";
import type { Trip } from "@/types/client/trip/trip.type";

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Props {
  trips: Trip[];
  loading: boolean;
  pagination: Pagination | null;
  onPageChange: (page: number) => void;
  onChooseTrip: (trip: Trip) => void;
}

export default function TripList({
  trips,
  loading,
  pagination,
  onPageChange,
  onChooseTrip,
}: Props) {
  if (loading) {
    return (
      <>
        <TripCardSkeleton />
        <TripCardSkeleton />
        <TripCardSkeleton />
      </>
    );
  }

  if (trips.length === 0) {
    return <EmptyState />;
  }

  return (
    <>
      {trips.map((trip) => (
        <TripCard key={trip.id} trip={trip} onChooseTrip={onChooseTrip} />
      ))}

      {pagination && pagination.totalPages > 1 && (
        <>
          <div className={styles.pagination}>
            <button
              className={`${styles.pageBtn} ${styles.navBtn}`}
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
            >
              ← Trước
            </button>

            {Array.from({ length: pagination.totalPages }).map((_, index) => {
              const page = index + 1;

              return (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  className={`${styles.pageBtn} ${
                    page === pagination.page ? styles.active : ""
                  }`}
                >
                  {page}
                </button>
              );
            })}

            <button
              className={`${styles.pageBtn} ${styles.navBtn}`}
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange(pagination.page + 1)}
            >
              Sau →
            </button>
          </div>

          <div className={styles.pageInfo}>
            Trang {pagination.page} / {pagination.totalPages}
            {" • "}
            {pagination.total} chuyến xe
          </div>
        </>
      )}
    </>
  );
}
