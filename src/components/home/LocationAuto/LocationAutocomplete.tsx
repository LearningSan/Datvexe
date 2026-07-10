"use client";

import React, { useEffect, useRef, useState } from "react";

import { ChevronRight, MapPin, Building2 } from "lucide-react";

import styles from "./LocationAutocomplete.module.css";

import { SelectedLocation } from "@/types/client/route/location-search.type";

import { useLocationSearch } from "@/hooks/client/useRoute";

type Props = {
  label: string;
  placeholder: string;
  value: SelectedLocation | null;
  onSelect: (value: SelectedLocation) => void;
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

  const [expandedZones, setExpandedZones] = useState<number[]>([]);

  const { data, isLoading } = useLocationSearch(keyword);

  const searchData = data || [];

  useEffect(() => {
    if (value?.label) {
      setKeyword(value.label);
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
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

  const toggleZone = (zoneId: number) => {
    setExpandedZones((prev) =>
      prev.includes(zoneId)
        ? prev.filter((id) => id !== zoneId)
        : [...prev, zoneId],
    );
  };

  /**
   * ✅ Luôn normalize về CITY ID
   * label vẫn giữ office / hub / city để UX đẹp hơn
   */
  const createCitySelection = (
    cityId: number,
    label: string,
  ): SelectedLocation => {
    return {
      type: "CITY",
      id: cityId,
      label,
    };
  };

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
          onFocus={() => {
            setFocused(true);

            if (keyword.trim().length >= 2) {
              setOpen(true);
            }
          }}
          onKeyDown={(e) => {
            // ❌ chặn enter submit form
            if (e.key === "Enter") {
              e.preventDefault();
            }
          }}
          onChange={(e) => {
            const value = e.target.value;

            setKeyword(value);

            setOpen(value.trim().length >= 2);
          }}
        />
      </div>

      {open && (
        <div className={styles.dropdown}>
          {isLoading && <div className={styles.loading}>Đang tìm kiếm...</div>}

          {!isLoading && !searchData.length && (
            <div className={styles.empty}>Không tìm thấy kết quả</div>
          )}

          {!isLoading &&
            searchData.map((city) => (
              <div key={city.city_id} className={styles.cityBlock}>
                {/* CITY */}
                <div className={styles.sectionTitle}>TỈNH / THÀNH</div>

                <button
                  type="button"
                  className={styles.cityItem}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.stopPropagation();

                    onSelect(createCitySelection(city.city_id, city.city_name));

                    setKeyword(city.city_name);

                    setOpen(false);
                  }}
                >
                  <MapPin size={18} />

                  <div className={styles.cityContent}>
                    <div className={styles.cityName}>{city.city_name}</div>

                    <small>Tỉnh / Thành phố</small>
                  </div>
                </button>

                {/* ZONES */}
                {!!city.zones.length && (
                  <>
                    <div className={styles.sectionTitle}>QUẬN / HUYỆN</div>

                    {city.zones.map((zone) => (
                      <div key={zone.zone_id}>
                        <button
                          type="button"
                          className={styles.zoneItem}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={(e) => {
                            e.stopPropagation();

                            toggleZone(zone.zone_id);
                          }}
                        >
                          <div className={styles.zoneLeft}>
                            <div className={styles.zoneName}>
                              {zone.zone_name}
                            </div>

                            <small>{zone.pickupPointCount} văn phòng</small>
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
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={(e) => {
                                  e.stopPropagation();

                                  /**
                                   * ✅ LABEL = office
                                   * ✅ ID = city_id
                                   */
                                  onSelect(
                                    createCitySelection(
                                      city.city_id,
                                      office.point_name,
                                    ),
                                  );

                                  setKeyword(office.point_name);

                                  setOpen(false);
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

                {/* DIRECT OFFICES */}
                {!!city.directPickupPoints.length && (
                  <>
                    <div className={styles.sectionTitle}>VĂN PHÒNG</div>

                    <div className={styles.officeList}>
                      {city.directPickupPoints.map((office) => (
                        <button
                          key={office.pickup_point_id}
                          type="button"
                          className={styles.officeItem}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={(e) => {
                            e.stopPropagation();

                            /**
                             * ✅ LABEL = office
                             * ✅ ID = city_id
                             */
                            onSelect(
                              createCitySelection(
                                city.city_id,
                                office.point_name,
                              ),
                            );

                            setKeyword(office.point_name);

                            setOpen(false);
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
