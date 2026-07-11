// SearchForm.tsx
"use client";

import React from "react";

import {
  ArrowLeftRight,
  Calendar as CalendarIcon,
  Ticket,
  Search,
} from "lucide-react";

import styles from "./SearchForm.module.css";

import Button from "@/components/ui/Button/Button";

import { getWeekday } from "@/lib/client/helpers";

import { SelectedLocation } from "@/types/client/route/location-search.type";

import { RecentSearch } from "@/store/search.store";

import LocationAutocomplete from "../LocationAuto/LocationAutocomplete";

type Props = {
  isRoundTrip: boolean;

  setIsRoundTrip: (v: boolean) => void;

  departureDate: string;

  setDepartureDate: (v: string) => void;

  returnDate: string;

  setReturnDate: (v: string) => void;

  ticketCount: number;

  setTicketCount: (v: number) => void;

  onSwap: () => void;

  onSubmit: (e: React.FormEvent) => void;

  origin: SelectedLocation | null;

  setOrigin: React.Dispatch<React.SetStateAction<SelectedLocation | null>>;

  destination: SelectedLocation | null;

  setDestination: React.Dispatch<React.SetStateAction<SelectedLocation | null>>;

  recentSearches?: RecentSearch[];

  onSelectHistory: (item: RecentSearch) => void;
};
function getTodayLocal() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
const today = getTodayLocal();
export default function SearchForm({
  isRoundTrip,
  setIsRoundTrip,
  origin,
  setOrigin,
  destination,
  setDestination,
  departureDate,
  setDepartureDate,
  returnDate,
  setReturnDate,
  ticketCount,
  setTicketCount,
  onSwap,
  onSubmit,
  recentSearches = [],
  onSelectHistory,
}: Props) {
  return (
    <div className={styles.searchCard}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onSubmit(e);
        }}
      >
        {/* TRIP TYPE */}
        <div className={styles.radioGroup}>
          <label>
            <input
              type="radio"
              checked={!isRoundTrip}
              onChange={() => setIsRoundTrip(false)}
              className={styles.radioInput}
            />
            Một chiều
          </label>

          <label>
            <input
              type="radio"
              checked={isRoundTrip}
              onChange={() => setIsRoundTrip(true)}
              className={styles.radioInput}
            />
            Khứ hồi
          </label>
        </div>

        {/* ROW 1 */}
        <div className={styles.row}>
          {/* ORIGIN */}
          <div className={styles.inputBlock}>
            <div className={styles.inputFieldWrapper}>
              <LocationAutocomplete
                label="Điểm đi"
                placeholder="Nhập điểm đi"
                value={origin}
                onSelect={setOrigin}
              />
            </div>
          </div>

          {/* SWAP */}
          <div className={styles.swapWrapper}>
            <button
              type="button"
              className={styles.swapButton}
              onClick={onSwap}
            >
              <ArrowLeftRight size={16} />
            </button>
          </div>

          {/* DEST */}
          <div className={styles.inputBlock}>
            <div className={styles.inputFieldWrapper}>
              <LocationAutocomplete
                label="Điểm đến"
                placeholder="Nhập điểm đến"
                value={destination}
                onSelect={setDestination}
              />
            </div>
          </div>
        </div>
        {/* ROW 2 */}
        <div className={styles.row}>
          <div className={styles.inputBlock}>
            <label className={styles.inputLabel}>Ngày đi</label>

            <div className={styles.dateField}>
              <CalendarIcon size={18} className={styles.inputIcon} />

              <div className={styles.dateContent}>
                <input
                  type="date"
                  className={styles.dateInput}
                  value={departureDate}
                  min={today}
                  onChange={(e) => {
                    const nextDepartureDate = e.target.value;

                    setDepartureDate(nextDepartureDate);

                    if (returnDate && returnDate < nextDepartureDate) {
                      setReturnDate(nextDepartureDate);
                    }
                  }}
                />

                <div className={styles.weekday}>
                  {departureDate ? getWeekday(departureDate) : ""}
                </div>
              </div>
            </div>
          </div>

          {isRoundTrip && (
            <div className={styles.inputBlock}>
              <label className={styles.inputLabel}>Ngày về</label>

              <div className={styles.dateField}>
                <CalendarIcon size={18} className={styles.inputIcon} />

                <div className={styles.dateContent}>
                  <input
                    type="date"
                    className={styles.dateInput}
                    value={returnDate}
                    min={departureDate || today}
                    onChange={(e) => setReturnDate(e.target.value)}
                  />

                  <div className={styles.weekday}>
                    {returnDate ? getWeekday(returnDate) : ""}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* KHỨ HỒI (NGÀY VỀ) */}
          {isRoundTrip && (
            <div className={styles.inputBlock}>
              <label className={styles.inputLabel}>Ngày về</label>

              {/* Sử dụng chung class dateField để đồng bộ chiều cao và giao diện */}
              <div className={styles.dateField}>
                <CalendarIcon size={18} className={styles.inputIcon} />

                <div className={styles.dateContent}>
                  <input
                    type="date"
                    className={styles.dateInput}
                    value={returnDate}
                    min={departureDate || today}
                    onChange={(e) => setReturnDate(e.target.value)}
                  />

                  <div className={styles.weekday}>
                    {returnDate ? getWeekday(returnDate) : ""}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TICKET */}
          <div className={styles.inputBlock}>
            <label className={styles.inputLabel}>Số vé</label>

            <div className={styles.inputFieldWrapper}>
              <Ticket size={18} className={styles.inputIcon} />

              <input
                type="number"
                min={1}
                max={5}
                className={styles.field}
                value={ticketCount}
                onChange={(e) => setTicketCount(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        {/* HISTORY */}
        {recentSearches.length > 0 && (
          <div className={styles.historyScroll}>
            {recentSearches.map((item, index) => (
              <button
                type="button"
                key={index}
                className={styles.historyCard}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onSelectHistory(item)}
              >
                <div className={styles.historyRoute}>
                  {item.origin?.label} → {item.destination?.label}
                </div>

                <div className={styles.historyMeta}>
                  🎫 {item.ticketCount} vé
                </div>

                <div className={styles.historyDate}>
                  📅 {new Date(item.departureDate).toLocaleDateString("vi-VN")}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* SUBMIT */}
        <div className={styles.searchButtonFloating}>
          <Button
            type="submit"
            size="lg"
            variant="primary"
            leftIcon={<Search size={18} />}
          >
            TÌM CHUYẾN XE
          </Button>
        </div>
      </form>
    </div>
  );
}
