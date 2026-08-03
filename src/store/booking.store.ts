import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { Trip } from "@/types/client/trip/trip.type";
import type { BookingSeat } from "@/types/client/booking/booking-seat.type";

export type PickupMethod = "OFFICE" | "SHUTTLE";

export type JourneyType = "OUTBOUND" | "RETURN";

export interface PassengerForm {
  fullName: string;
  phone: string;
  email: string;
}

export interface ShuttleAddress {
  address: string;
  latitude?: number;
  longitude?: number;
}
export interface JourneyRouteInfo {
  pickupPointId: number | null;
  dropoffPointId: number | null;

  pickupMethod: PickupMethod;
  dropoffMethod: PickupMethod;

  pickupAddress: ShuttleAddress | null;
  dropoffAddress: ShuttleAddress | null;
}
/* =========================
   STORE TYPE
========================= */

interface BookingStore {
  // ================= HYDRATION =================
  hydrated: boolean;
  setHydrated: (value: boolean) => void;

  isRoundTrip: boolean;
  setIsRoundTrip: (value: boolean) => void;

  activeJourney: JourneyType;
  setActiveJourney: (journey: JourneyType) => void;

  outboundTrip: Trip | null;
  returnTrip: Trip | null;

  clearOutboundTrip: () => void;
  clearReturnTrip: () => void;
  clearAllTrips: () => void;

  // ================= CURRENT TRIP =================
  /*
   * Giữ lại để trang chi tiết chuyến hiện tại
   * không cần sửa ngay.
   */
  selectedTrip: Trip | null;

  setSelectedTrip: (trip: Trip) => void;
  clearSelectedTrip: () => void;

  outboundSeats: BookingSeat[];
  returnSeats: BookingSeat[];
  toggleSeat: (seat: BookingSeat) => void;
  clearSeats: () => void;

  subtotal: number;
  promotionDiscount: number;
  totalPrice: number;

  promotionCode: string;
  setPromotion: (code: string, discount: number) => void;
  clearPromotion: () => void;

  // ================= FORM =================
  submitted: boolean;
  setSubmitted: (value: boolean) => void;

  acceptedTerms: boolean;
  setAcceptedTerms: (value: boolean) => void;

  passenger: PassengerForm;
  setPassenger: (payload: Partial<PassengerForm>) => void;
  resetPassenger: () => void;

  // ================= PICKUP/DROPOFF =================
  outboundRoute: JourneyRouteInfo;
  returnRoute: JourneyRouteInfo;

  setOutboundRoute: (payload: Partial<JourneyRouteInfo>) => void;

  setReturnRoute: (payload: Partial<JourneyRouteInfo>) => void;

  // ================= SHUTTLE =================
  shuttleLoading: boolean;
  shuttleError: string | null;

  setShuttleLoading: (value: boolean) => void;
  setShuttleError: (value: string | null) => void;

  // ================= RESET =================
  resetBooking: () => void;
}
interface BookingState {
  hydrated: boolean;

  isRoundTrip: boolean;
  activeJourney: JourneyType;

  outboundTrip: Trip | null;
  returnTrip: Trip | null;
  selectedTrip: Trip | null;

  outboundSeats: BookingSeat[];
  returnSeats: BookingSeat[];

  subtotal: number;
  promotionDiscount: number;
  totalPrice: number;

  promotionCode: string;

  submitted: boolean;
  acceptedTerms: boolean;

  passenger: PassengerForm;

  outboundRoute: JourneyRouteInfo;
  returnRoute: JourneyRouteInfo;

  shuttleLoading: boolean;
  shuttleError: string | null;
}
/* =========================
   INITIAL STATE
========================= */

const initialState: BookingState = {
  hydrated: false,

  isRoundTrip: false,
  activeJourney: "OUTBOUND",

  outboundTrip: null,
  returnTrip: null,
  selectedTrip: null,

  outboundSeats: [],
  returnSeats: [],

  subtotal: 0,
  promotionDiscount: 0,
  totalPrice: 0,

  promotionCode: "",

  submitted: false,
  acceptedTerms: false,

  passenger: {
    fullName: "",
    phone: "",
    email: "",
  },

  outboundRoute: {
    pickupPointId: null,
    dropoffPointId: null,

    pickupMethod: "OFFICE",
    dropoffMethod: "OFFICE",

    pickupAddress: null,
    dropoffAddress: null,
  },

  returnRoute: {
    pickupPointId: null,
    dropoffPointId: null,

    pickupMethod: "OFFICE",
    dropoffMethod: "OFFICE",

    pickupAddress: null,
    dropoffAddress: null,
  },

  shuttleLoading: false,
  shuttleError: null,
};

/* =========================
   STORE
========================= */

export const useBookingStore = create<BookingStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ================= HYDRATION =================
      setHydrated: (hydrated) =>
        set({
          hydrated,
        }),

      // ================= ROUND TRIP =================
      setIsRoundTrip: (isRoundTrip) =>
        set((state) => ({
          isRoundTrip,

          returnTrip: isRoundTrip ? state.returnTrip : null,
          returnSeats: isRoundTrip ? state.returnSeats : [],
          returnRoute: isRoundTrip
            ? state.returnRoute
            : initialState.returnRoute,

          activeJourney: isRoundTrip ? state.activeJourney : "OUTBOUND",
          selectedTrip: isRoundTrip ? state.selectedTrip : state.outboundTrip,
        })),

      setActiveJourney: (activeJourney) => {
        const state = get();

        /*
         * Vé một chiều không được chuyển sang tab chuyến về.
         */
        if (activeJourney === "RETURN" && !state.isRoundTrip) {
          return;
        }

        const journeyTrip =
          activeJourney === "OUTBOUND" ? state.outboundTrip : state.returnTrip;

        set({
          activeJourney,
          selectedTrip: journeyTrip,
        });
      },

      // ================= TRIP =================
      setSelectedTrip: (trip) => {
        const activeJourney = get().activeJourney;

        if (activeJourney === "OUTBOUND") {
          set({
            selectedTrip: trip,
            outboundTrip: trip,
          });

          return;
        }

        set({
          selectedTrip: trip,
          returnTrip: trip,
        });
      },

      clearSelectedTrip: () =>
        set({
          selectedTrip: null,
        }),

      clearOutboundTrip: () =>
        set((state) => ({
          outboundTrip: null,

          selectedTrip:
            state.activeJourney === "OUTBOUND" ? null : state.selectedTrip,
        })),

      clearReturnTrip: () =>
        set((state) => ({
          returnTrip: null,

          selectedTrip:
            state.activeJourney === "RETURN" ? null : state.selectedTrip,
        })),

      clearAllTrips: () =>
        set({
          selectedTrip: null,
          outboundTrip: null,
          returnTrip: null,
          activeJourney: "OUTBOUND",
          outboundSeats: [],
          returnSeats: [],

          outboundRoute: initialState.outboundRoute,
          returnRoute: initialState.returnRoute,
        }),

      // ================= SEATS =================
      toggleSeat: (seat) =>
        set((state) => {
          const currentSeats =
            state.activeJourney === "OUTBOUND"
              ? state.outboundSeats
              : state.returnSeats;

          const exists = currentSeats.some(
            (item) => item.seatId === seat.seatId,
          );

          const updatedSeats = exists
            ? currentSeats.filter((item) => item.seatId !== seat.seatId)
            : [...currentSeats, seat];

          const outboundSeats =
            state.activeJourney === "OUTBOUND"
              ? updatedSeats
              : state.outboundSeats;

          const returnSeats =
            state.activeJourney === "RETURN" ? updatedSeats : state.returnSeats;

          const subtotal = [...outboundSeats, ...returnSeats].reduce(
            (sum, item) => sum + item.price,
            0,
          );

          return {
            outboundSeats,
            returnSeats,
            subtotal,
            totalPrice: Math.max(subtotal - state.promotionDiscount, 0),
          };
        }),

      clearSeats: () =>
        set({
          outboundSeats: [],
          returnSeats: [],
          subtotal: 0,
          totalPrice: 0,

          outboundRoute: initialState.outboundRoute,
          returnRoute: initialState.returnRoute,
        }),
      // ================= PROMOTION =================
      setPromotion: (code, discount) =>
        set((state) => ({
          promotionCode: code,
          promotionDiscount: discount,

          totalPrice: Math.max(state.subtotal - discount, 0),
        })),

      clearPromotion: () =>
        set((state) => ({
          promotionCode: "",
          promotionDiscount: 0,
          totalPrice: state.subtotal,
        })),

      // ================= FORM SUBMIT =================
      setSubmitted: (submitted) =>
        set({
          submitted,
        }),

      // ================= TERMS =================
      setAcceptedTerms: (acceptedTerms) =>
        set({
          acceptedTerms,
        }),

      // ================= PASSENGER =================
      setPassenger: (payload) =>
        set((state) => ({
          passenger: {
            ...state.passenger,
            ...payload,
          },
        })),

      resetPassenger: () =>
        set({
          passenger: {
            fullName: "",
            phone: "",
            email: "",
          },
        }),

      // ================= ROUTE =================
      setOutboundRoute: (payload) =>
        set((state) => ({
          outboundRoute: {
            ...state.outboundRoute,
            ...payload,
          },
        })),

      setReturnRoute: (payload) =>
        set((state) => ({
          returnRoute: {
            ...state.returnRoute,
            ...payload,
          },
        })),
      // ================= SHUTTLE =================
      setShuttleLoading: (shuttleLoading) =>
        set({
          shuttleLoading,
        }),

      setShuttleError: (shuttleError) =>
        set({
          shuttleError,
        }),

      // ================= RESET =================
      resetBooking: () =>
        set({
          ...initialState,
          hydrated: true,
        }),
    }),
    {
      name: "booking-storage",

      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },

      partialize: (state) => ({
        isRoundTrip: state.isRoundTrip,
        activeJourney: state.activeJourney,

        outboundTrip: state.outboundTrip,
        returnTrip: state.returnTrip,
        selectedTrip: state.selectedTrip,

        outboundSeats: state.outboundSeats,
        returnSeats: state.returnSeats,
        subtotal: state.subtotal,
        promotionCode: state.promotionCode,
        promotionDiscount: state.promotionDiscount,
        totalPrice: state.totalPrice,

        passenger: state.passenger,
        outboundRoute: state.outboundRoute,
        returnRoute: state.returnRoute,
      }),
    },
  ),
);
