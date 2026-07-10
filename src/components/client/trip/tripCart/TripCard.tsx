"use client";

import styles from "./TripCard.module.css";

import Button from "@/components/ui/Button/Button";
import { MapPin } from "lucide-react";
import { useRouter } from "next/navigation";

import type { Trip } from "@/types/client/trip/trip.type";

interface Props {
  trip: Trip;
  onChooseTrip: (trip: Trip) => void;
}

export default function TripCard({ trip, onChooseTrip }: Props) {
  const router = useRouter();

  const imageSrc = trip.imageUrl || "/images/bus-placeholder.jpg";

  return (
    <div className={styles.card}>
      <div className={styles.top}>
        <div className={styles.imageBox}>
          <img
            src={imageSrc}
            alt={trip.vehicleName || trip.type}
            className={styles.vehicleImage}
          />
        </div>

        <div className={styles.left}>
          <div className={styles.timeRow}>
            <div className={styles.side}>
              <div className={styles.time}>{trip.departureTime}</div>
              <div className={styles.station}>{trip.originCity}</div>
            </div>

            <div className={styles.middle}>
              <div className={styles.durationBox}>
                <div className={styles.durationText}>
                  {trip.duration}h{" - "}
                  {trip.distance}km
                </div>

                <div className={styles.timezone}>(Asia/Ho Chi Minh)</div>
              </div>

              <div className={styles.lineWrapper}>
                <div className={styles.startDot}></div>
                <div className={styles.line}></div>

                <div className={styles.pin}>
                  <MapPin size={18} />
                </div>
              </div>
            </div>

            <div className={styles.side}>
              <div className={styles.time}>{trip.arrivalTime}</div>
              <div className={styles.station}>{trip.destinationCity}</div>
            </div>
          </div>
        </div>

        <div className={styles.right}>
          <div className={styles.meta}>
            <span>{trip.type}</span>
            <span>{trip.floorCount} tầng</span>
            <span className={styles.seats}>
              {trip.availableSeats} chỗ trống
            </span>
          </div>

          <div className={styles.price}>
            {trip.price.toLocaleString("vi-VN")}đ
          </div>
        </div>
      </div>

      <div className={styles.divider}></div>

      <div className={styles.footer}>
        <div className={styles.tabs}>
          <button onClick={() => router.push(`/trips/${trip.id}`)}>
            Chọn ghế
          </button>

          <button onClick={() => router.push(`/trips/${trip.id}/schedule`)}>
            Lịch trình
          </button>

          <button onClick={() => router.push(`/trips/${trip.id}/shuttle`)}>
            Trung chuyển
          </button>

          <button onClick={() => router.push(`/trips/${trip.id}/policy`)}>
            Chính sách
          </button>
        </div>

        <Button
          variant="primary"
          className={styles.chooseBtn}
          onClick={() => onChooseTrip(trip)}
        >
          Chọn chuyến
        </Button>
      </div>
    </div>
  );
}
