"use client";

import styles from "./PickupDropoff.module.css";

import { useEffect, useMemo, useState } from "react";

import { useSearchStore } from "@/store/search.store";
import { useBookingStore } from "@/store/booking.store";

import { useZones } from "@/hooks/client/useRoute";
import { useOfficePickupPoints } from "@/hooks/client/useRoute";
import { usePickupPointMatch } from "@/hooks/client/useRoute";

import type { PickupPoint } from "@/types/client/route/route.type";

interface Props {
  tripId: number;
}

export default function PickupDropoffSection({}: Props) {
  const currentSearch = useSearchStore((state) => state.currentSearch);

  const {
    pickupMethod,
    dropoffMethod,

    pickupPointId,
    dropoffPointId,

    pickupAddress,
    dropoffAddress,

    setPickupMethod,
    setDropoffMethod,

    setPickupPoint,
    setDropoffPoint,

    setPickupAddress,
    setDropoffAddress,
  } = useBookingStore();

  const [openPickup, setOpenPickup] = useState(false);

  const [openDropoff, setOpenDropoff] = useState(false);

  // =========================
  // CITY
  // =========================
  const originCityId = currentSearch?.origin?.id;

  const destinationCityId = currentSearch?.destination?.id;

  // =========================
  // ZONES
  // =========================
  const { data: originZones = [] } = useZones(originCityId);

  const { data: destinationZones = [] } = useZones(destinationCityId);

  const originZoneIds = useMemo(
    () => originZones.map((z) => z.zone_id),
    [originZones],
  );

  const destinationZoneIds = useMemo(
    () => destinationZones.map((z) => z.zone_id),
    [destinationZones],
  );

  // =========================
  // OFFICE POINTS
  // =========================
  const { data: pickupPoints = [] } = useOfficePickupPoints(
    originCityId,
    originZoneIds,
  );

  const { data: dropoffPoints = [] } = useOfficePickupPoints(
    destinationCityId,
    destinationZoneIds,
  );

  // =========================
  // MATCH EXACT OFFICE
  // =========================
  const { data: pickupMatch } = usePickupPointMatch(
    currentSearch?.origin?.label,
    originCityId,
  );
  const { data: dropoffMatch } = usePickupPointMatch(
    currentSearch?.destination?.label,
    destinationCityId,
  );

  const selectedPickup = pickupPoints.find(
    (p: PickupPoint) => p.pickup_point_id === pickupPointId,
  );

  const selectedDropoff = dropoffPoints.find(
    (p: PickupPoint) => p.pickup_point_id === dropoffPointId,
  );

  useEffect(() => {
    if (!pickupPoints.length) return;

    setPickupMethod("OFFICE");

    if (pickupMatch?.pickupPointId) {
      setPickupPoint(pickupMatch.pickupPointId);
      return;
    }

    setPickupPoint(pickupPoints[0]?.pickup_point_id ?? null);
  }, [
    currentSearch?.origin?.label,
    currentSearch?.origin?.id,
    pickupPoints,
    pickupMatch,
    setPickupMethod,
    setPickupPoint,
  ]);
  useEffect(() => {
    if (!dropoffPoints.length) return;

    setDropoffMethod("OFFICE");

    if (dropoffMatch?.pickupPointId) {
      setDropoffPoint(dropoffMatch.pickupPointId);
      return;
    }

    setDropoffPoint(dropoffPoints[0]?.pickup_point_id ?? null);
  }, [
    currentSearch?.destination?.label,
    currentSearch?.destination?.id,
    dropoffPoints,
    dropoffMatch,
    setDropoffMethod,
    setDropoffPoint,
  ]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.cardSection}>
        <div className={styles.cardTitle}>Điểm đón</div>

        <div className={styles.tabs}>
          <button
            type="button"
            className={
              pickupMethod === "OFFICE" ? styles.activeTab : styles.tab
            }
            onClick={() => setPickupMethod("OFFICE")}
          >
            Văn phòng
          </button>

          <button
            type="button"
            className={
              pickupMethod === "SHUTTLE" ? styles.activeTab : styles.tab
            }
            onClick={() => setPickupMethod("SHUTTLE")}
          >
            Trung chuyển
          </button>
        </div>

        {pickupMethod === "OFFICE" ? (
          <div className={styles.dropdown}>
            <div
              className={styles.selected}
              onClick={() => setOpenPickup((v) => !v)}
            >
              {selectedPickup
                ? `${selectedPickup.point_name} - ${selectedPickup.address}`
                : "Chọn điểm đón"}
            </div>

            {openPickup && (
              <div className={styles.menu}>
                {pickupPoints.map((item) => (
                  <div
                    key={item.pickup_point_id}
                    className={styles.option}
                    onClick={() => {
                      setPickupPoint(item.pickup_point_id);

                      setOpenPickup(false);
                    }}
                  >
                    <div className={styles.name}>{item.point_name}</div>

                    <div className={styles.address}>{item.address}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <input
            className={styles.input}
            placeholder="Nhập địa chỉ trung chuyển"
            value={pickupAddress?.address || ""}
            onChange={(e) =>
              setPickupAddress({
                address: e.target.value,
              })
            }
          />
        )}
      </div>

      <div className={styles.spacing} />

      <div className={styles.cardSection}>
        <div className={styles.cardTitle}>Điểm trả</div>

        <div className={styles.tabs}>
          <button
            type="button"
            className={
              dropoffMethod === "OFFICE" ? styles.activeTab : styles.tab
            }
            onClick={() => setDropoffMethod("OFFICE")}
          >
            Văn phòng
          </button>

          <button
            type="button"
            className={
              dropoffMethod === "SHUTTLE" ? styles.activeTab : styles.tab
            }
            onClick={() => setDropoffMethod("SHUTTLE")}
          >
            Trung chuyển
          </button>
        </div>

        {dropoffMethod === "OFFICE" ? (
          <div className={styles.dropdown}>
            <div
              className={styles.selected}
              onClick={() => setOpenDropoff((v) => !v)}
            >
              {selectedDropoff
                ? `${selectedDropoff.point_name} - ${selectedDropoff.address}`
                : "Chọn điểm trả"}
            </div>

            {openDropoff && (
              <div className={styles.menu}>
                {dropoffPoints.map((item) => (
                  <div
                    key={item.pickup_point_id}
                    className={styles.option}
                    onClick={() => {
                      setDropoffPoint(item.pickup_point_id);

                      setOpenDropoff(false);
                    }}
                  >
                    <div className={styles.name}>{item.point_name}</div>

                    <div className={styles.address}>{item.address}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <input
            className={styles.input}
            placeholder="Nhập địa chỉ trung chuyển"
            value={dropoffAddress?.address || ""}
            onChange={(e) =>
              setDropoffAddress({
                address: e.target.value,
              })
            }
          />
        )}
      </div>
    </div>
  );
}
