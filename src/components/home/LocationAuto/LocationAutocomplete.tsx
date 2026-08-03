"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronRight, MapPin, Building2 } from "lucide-react";

import styles from "./LocationAutocomplete.module.css";

import type { SelectedLocation } from "@/types/client/route/location-search.type";
import { useLocationSearch } from "@/hooks/client/useRoute";

type Props = {
  label: string;
  placeholder: string;
  value: SelectedLocation | null;
  onSelect: (value: SelectedLocation | null) => void;
};

export default function LocationAutocomplete({
  label,
  placeholder,
  value,
  onSelect,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [keyword, setKeyword] = useState("");
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [expandedZones, setExpandedZones] = useState<number[]>([]);

  const normalizedKeyword = keyword.trim();

  const { data = [], isFetching } = useLocationSearch(
    normalizedKeyword,
    open && isTyping,
  );

  useEffect(() => {
    if (value) {
      setKeyword(value.label);
      setIsTyping(false);
      setOpen(false);
      return;
    }

    setKeyword("");
    setIsTyping(false);
    setOpen(false);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target;

      if (
        wrapperRef.current &&
        target instanceof Node &&
        !wrapperRef.current.contains(target)
      ) {
        setOpen(false);
        setFocused(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  function toggleZone(zoneId: number) {
    setExpandedZones((previous) =>
      previous.includes(zoneId)
        ? previous.filter((id) => id !== zoneId)
        : [...previous, zoneId],
    );
  }

  function handleSelectLocation(selected: SelectedLocation) {
    setKeyword(selected.label);
    setIsTyping(false);
    setOpen(false);
    setExpandedZones([]);

    onSelect(selected);
  }

  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      <label className={styles.label}>{label}</label>

      <div
        className={`
          ${styles.inputWrapper}
          ${focused ? styles.focused : ""}
        `}
      >
        <MapPin size={18} className={styles.icon} />

        <input
          value={keyword}
          placeholder={placeholder}
          className={styles.input}
          autoComplete="off"
          onFocus={() => {
            setFocused(true);

            if (isTyping && normalizedKeyword.length >= 2) {
              setOpen(true);
            }
          }}
          onChange={(event) => {
            const nextKeyword = event.target.value;

            setKeyword(nextKeyword);
            setIsTyping(true);
            setOpen(nextKeyword.trim().length >= 2);

            /*
             * Người dùng đã sửa text sau khi chọn địa điểm.
             * Phải xóa SelectedLocation cũ.
             */
            if (value && nextKeyword !== value.label) {
              onSelect(null);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
            }

            /*
             * Chỉ chặn Enter khi dropdown đang mở.
             * Nếu dropdown đóng thì Enter vẫn có thể submit form.
             */
            if (event.key === "Enter" && open) {
              event.preventDefault();
            }
          }}
        />
      </div>

      {open && (
        <div className={styles.dropdown}>
          {isFetching && <div className={styles.loading}>Đang tìm kiếm...</div>}

          {!isFetching && data.length === 0 && (
            <div className={styles.empty}>Không tìm thấy kết quả</div>
          )}

          {!isFetching &&
            data.map((city) => (
              <div key={city.city_id} className={styles.cityBlock}>
                <div className={styles.sectionTitle}>TỈNH / THÀNH</div>

                <button
                  type="button"
                  className={styles.cityItem}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={(event) => {
                    event.stopPropagation();

                    handleSelectLocation({
                      type: "CITY",
                      id: city.city_id,
                      cityId: city.city_id,
                      label: city.city_name,
                    });
                  }}
                >
                  <MapPin size={18} />

                  <div className={styles.cityContent}>
                    <div className={styles.cityName}>{city.city_name}</div>
                    <small>Tỉnh / Thành phố</small>
                  </div>
                </button>

                {city.zones.length > 0 && (
                  <>
                    <div className={styles.sectionTitle}>QUẬN / HUYỆN</div>

                    {city.zones.map((zone) => (
                      <div key={zone.zone_id}>
                        <button
                          type="button"
                          className={styles.zoneItem}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleZone(zone.zone_id);
                          }}
                        >
                          <div className={styles.zoneLeft}>
                            <div className={styles.zoneName}>
                              {zone.zone_name}
                            </div>

                            <small>
                              {zone.pickupPointCount} điểm đón/văn phòng
                            </small>
                          </div>

                          <ChevronRight
                            size={16}
                            className={
                              expandedZones.includes(zone.zone_id)
                                ? styles.rotate
                                : ""
                            }
                          />
                        </button>

                        {expandedZones.includes(zone.zone_id) && (
                          <div className={styles.officeList}>
                            {zone.pickupPoints.map((office) => (
                              <button
                                key={office.pickup_point_id}
                                type="button"
                                className={styles.officeItem}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={(event) => {
                                  event.stopPropagation();

                                  handleSelectLocation({
                                    type: "OFFICE",
                                    id: office.pickup_point_id,
                                    cityId: city.city_id,
                                    zoneId: zone.zone_id,
                                    label: office.point_name,
                                    address: office.address,
                                  });
                                }}
                              >
                                <Building2 size={15} />

                                <div>
                                  <div className={styles.officeName}>
                                    {office.point_name}
                                  </div>

                                  <small>{office.address}</small>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                )}

                {city.directPickupPoints.length > 0 && (
                  <>
                    <div className={styles.sectionTitle}>VĂN PHÒNG</div>

                    <div className={styles.officeList}>
                      {city.directPickupPoints.map((office) => (
                        <button
                          key={office.pickup_point_id}
                          type="button"
                          className={styles.officeItem}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={(event) => {
                            event.stopPropagation();

                            handleSelectLocation({
                              type: "OFFICE",
                              id: office.pickup_point_id,
                              cityId: city.city_id,
                              zoneId: office.zone_id ?? undefined,
                              label: office.point_name,
                              address: office.address,
                            });
                          }}
                        >
                          <Building2 size={15} />

                          <div>
                            <div className={styles.officeName}>
                              {office.point_name}
                            </div>

                            <small>{office.address}</small>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
