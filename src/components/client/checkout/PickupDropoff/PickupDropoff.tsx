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
    activeJourney,

    outboundRoute,
    returnRoute,

    setOutboundRoute,
    setReturnRoute,
  } = useBookingStore();
  const isRoundTrip = useBookingStore((s) => s.isRoundTrip);
  const setActiveJourney = useBookingStore((s) => s.setActiveJourney);
  const route = activeJourney === "OUTBOUND" ? outboundRoute : returnRoute;

  const updateRoute =
    activeJourney === "OUTBOUND" ? setOutboundRoute : setReturnRoute;

  const [openPickup, setOpenPickup] = useState(false);

  const [openDropoff, setOpenDropoff] = useState(false);
  const outboundOriginCityId = currentSearch?.origin?.id;
  const outboundDestinationCityId = currentSearch?.destination?.id;

  const returnOriginCityId = currentSearch?.destination?.id;
  const returnDestinationCityId = currentSearch?.origin?.id;
  const { data: outboundOriginZones = [] } = useZones(outboundOriginCityId);
  const { data: outboundDestinationZones = [] } = useZones(
    outboundDestinationCityId,
  );

  const outboundOriginZoneIds = useMemo(
    () => outboundOriginZones.map((z) => z.zone_id),
    [outboundOriginZones],
  );

  const outboundDestinationZoneIds = useMemo(
    () => outboundDestinationZones.map((z) => z.zone_id),
    [outboundDestinationZones],
  );

  const { data: outboundPickupPoints = [] } = useOfficePickupPoints(
    outboundOriginCityId,
    outboundOriginZoneIds,
  );

  const { data: outboundDropoffPoints = [] } = useOfficePickupPoints(
    outboundDestinationCityId,
    outboundDestinationZoneIds,
  );

  const { data: outboundPickupMatch } = usePickupPointMatch(
    currentSearch?.origin?.label,
    outboundOriginCityId,
  );

  const { data: outboundDropoffMatch } = usePickupPointMatch(
    currentSearch?.destination?.label,
    outboundDestinationCityId,
  );
  const { data: returnOriginZones = [] } = useZones(returnOriginCityId);
  const { data: returnDestinationZones = [] } = useZones(
    returnDestinationCityId,
  );

  const returnOriginZoneIds = useMemo(
    () => returnOriginZones.map((z) => z.zone_id),
    [returnOriginZones],
  );

  const returnDestinationZoneIds = useMemo(
    () => returnDestinationZones.map((z) => z.zone_id),
    [returnDestinationZones],
  );

  const { data: returnPickupPoints = [] } = useOfficePickupPoints(
    returnOriginCityId,
    returnOriginZoneIds,
  );

  const { data: returnDropoffPoints = [] } = useOfficePickupPoints(
    returnDestinationCityId,
    returnDestinationZoneIds,
  );

  const { data: returnPickupMatch } = usePickupPointMatch(
    currentSearch?.destination?.label,
    returnOriginCityId,
  );

  const { data: returnDropoffMatch } = usePickupPointMatch(
    currentSearch?.origin?.label,
    returnDestinationCityId,
  );
  useEffect(() => {
    if (!outboundPickupPoints.length) return;

    setOutboundRoute({
      pickupMethod: "OFFICE",
      pickupPointId:
        outboundPickupMatch?.pickupPointId ??
        outboundPickupPoints[0]?.pickup_point_id ??
        null,
    });
  }, [outboundPickupPoints, outboundPickupMatch, setOutboundRoute]);

  useEffect(() => {
    if (!outboundDropoffPoints.length) return;

    setOutboundRoute({
      dropoffMethod: "OFFICE",
      dropoffPointId:
        outboundDropoffMatch?.pickupPointId ??
        outboundDropoffPoints[0]?.pickup_point_id ??
        null,
    });
  }, [outboundDropoffPoints, outboundDropoffMatch, setOutboundRoute]);
  useEffect(() => {
    if (!isRoundTrip) return;
    if (!returnPickupPoints.length) return;

    setReturnRoute({
      pickupMethod: "OFFICE",
      pickupPointId:
        returnPickupMatch?.pickupPointId ??
        returnPickupPoints[0]?.pickup_point_id ??
        null,
    });
  }, [isRoundTrip, returnPickupPoints, returnPickupMatch, setReturnRoute]);

  useEffect(() => {
    if (!isRoundTrip) return;
    if (!returnDropoffPoints.length) return;

    setReturnRoute({
      dropoffMethod: "OFFICE",
      dropoffPointId:
        returnDropoffMatch?.pickupPointId ??
        returnDropoffPoints[0]?.pickup_point_id ??
        null,
    });
  }, [isRoundTrip, returnDropoffPoints, returnDropoffMatch, setReturnRoute]);
  const pickupPoints =
    activeJourney === "OUTBOUND" ? outboundPickupPoints : returnPickupPoints;

  const dropoffPoints =
    activeJourney === "OUTBOUND" ? outboundDropoffPoints : returnDropoffPoints;
  const selectedPickup = pickupPoints.find(
    (p: PickupPoint) => p.pickup_point_id === route.pickupPointId,
  );

  const selectedDropoff = dropoffPoints.find(
    (p: PickupPoint) => p.pickup_point_id === route.dropoffPointId,
  );
  return (
    <div className={styles.wrapper}>
      {isRoundTrip && (
        <div className={styles.journeyTabs}>
          <button
            type="button"
            className={
              activeJourney === "OUTBOUND"
                ? styles.activeJourneyTab
                : styles.journeyTab
            }
            onClick={() => setActiveJourney("OUTBOUND")}
          >
            Chuyến đi
          </button>

          <button
            type="button"
            className={
              activeJourney === "RETURN"
                ? styles.activeJourneyTab
                : styles.journeyTab
            }
            onClick={() => setActiveJourney("RETURN")}
          >
            Chuyến về
          </button>
        </div>
      )}
      <div className={styles.cardSection}>
        <div className={styles.cardTitle}>Điểm đón</div>

        <div className={styles.tabs}>
          <button
            type="button"
            className={
              route.pickupMethod === "OFFICE" ? styles.activeTab : styles.tab
            }
            onClick={() =>
              updateRoute({
                pickupMethod: "OFFICE",
              })
            }
          >
            Văn phòng
          </button>

          <button
            type="button"
            className={
              route.pickupMethod === "SHUTTLE" ? styles.activeTab : styles.tab
            }
            onClick={() =>
              updateRoute({
                pickupMethod: "SHUTTLE",
              })
            }
          >
            Trung chuyển
          </button>
        </div>

        {route.pickupMethod === "OFFICE" ? (
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
                      updateRoute({
                        pickupPointId: item.pickup_point_id,
                      });
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
            value={route.pickupAddress?.address || ""}
            onChange={(e) =>
              updateRoute({
                pickupAddress: {
                  address: e.target.value,
                },
              })
            }
          />
        )}
      </div>

      <div className={styles.cardSection}>
        <div className={styles.cardTitle}>Điểm trả</div>

        <div className={styles.tabs}>
          <button
            type="button"
            className={
              route.dropoffMethod === "OFFICE" ? styles.activeTab : styles.tab
            }
            onClick={() =>
              updateRoute({
                dropoffMethod: "OFFICE",
              })
            }
          >
            Văn phòng
          </button>

          <button
            type="button"
            className={
              route.dropoffMethod === "SHUTTLE" ? styles.activeTab : styles.tab
            }
            onClick={() =>
              updateRoute({
                dropoffMethod: "SHUTTLE",
              })
            }
          >
            Trung chuyển
          </button>
        </div>

        {route.dropoffMethod === "OFFICE" ? (
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
                      updateRoute({
                        dropoffPointId: item.pickup_point_id,
                      });
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
            value={route.dropoffAddress?.address || ""}
            onChange={(e) =>
              updateRoute({
                dropoffAddress: {
                  address: e.target.value,
                },
              })
            }
          />
        )}
      </div>
    </div>
  );
}
