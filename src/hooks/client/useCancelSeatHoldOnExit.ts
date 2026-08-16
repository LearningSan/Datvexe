"use client";

import { useEffect, useRef } from "react";

import { cancelSeatHoldOnExit } from "@/services/client/booking.service";

import type { ActiveSeatHold } from "@/types/client/payment/payment.type";

const ACTIVE_HOLD_KEY = "active_seat_hold";
const HOLD_CANCELLED_KEY = "hold_cancelled";

export function getActiveSeatHold(): ActiveSeatHold | null {
  try {
    const raw = sessionStorage.getItem(ACTIVE_HOLD_KEY);

    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setActiveSeatHold(hold: ActiveSeatHold) {
  sessionStorage.removeItem(HOLD_CANCELLED_KEY);

  sessionStorage.setItem(ACTIVE_HOLD_KEY, JSON.stringify(hold));
}

export function clearActiveSeatHold() {
  sessionStorage.removeItem(ACTIVE_HOLD_KEY);
  sessionStorage.removeItem(HOLD_CANCELLED_KEY);
}

export function isHoldCancelled() {
  return sessionStorage.getItem(HOLD_CANCELLED_KEY) === "1";
}

export function markHoldCancelled() {
  sessionStorage.setItem(HOLD_CANCELLED_KEY, "1");
}

export function useCancelSeatHoldOnExit() {
  const cancelledRef = useRef(false);

  useEffect(() => {

    const cancelHold = () => {

      if (cancelledRef.current) {
        return;
      }

      if (isHoldCancelled()) {
        return;
      }

      const hold = getActiveSeatHold();


      if (!hold?.sessionId) {
        return;
      }

      if (!hold?.tripIds || hold.tripIds.length === 0) {
        return;
      }

      cancelledRef.current = true;

      markHoldCancelled();


      cancelSeatHoldOnExit(hold);

      clearActiveSeatHold();

    };

    const handleBeforeUnload = () => {
    };

    const handleVisibilityChange = () => {
    };


    window.addEventListener("pagehide", cancelHold);
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", cancelHold);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);
}
