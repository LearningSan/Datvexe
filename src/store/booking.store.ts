import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { Trip } from "@/types/client/trip/trip.type";
import { BookingSeat } from "@/types/client/booking/booking-seat.type";

/* =========================
   TYPES
========================= */
export type PickupMethod = "OFFICE" | "SHUTTLE";

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

/* =========================
   STORE TYPE
========================= */
interface BookingStore {
  // ================= HYDRATION =================
  hydrated: boolean;
  setHydrated: (v: boolean) => void;

  // ================= TRIP =================
  selectedTrip: Trip | null;
  setSelectedTrip: (trip: Trip) => void;
  clearSelectedTrip: () => void;

  // ================= SEATS =================
  selectedSeats: BookingSeat[];
  toggleSeat: (seat: BookingSeat) => void;
  clearSeats: () => void;

  // ================= PRICE =================
  subtotal: number;
  promotionDiscount: number;
  totalPrice: number;

  promotionCode: string;
  setPromotion: (code: string, discount: number) => void;
  clearPromotion: () => void;

  submitted: boolean;
  setSubmitted: (value: boolean) => void;

  acceptedTerms: boolean;
  setAcceptedTerms: (value: boolean) => void;

  passenger: PassengerForm;
  setPassenger: (payload: Partial<PassengerForm>) => void;
  resetPassenger: () => void;

  pickupPointId: number | null;
  dropoffPointId: number | null;

  pickupMethod: PickupMethod;
  dropoffMethod: PickupMethod;

  pickupAddress: ShuttleAddress | null;
  dropoffAddress: ShuttleAddress | null;

  setPickupPoint: (id: number | null) => void;
  setDropoffPoint: (id: number | null) => void;

  setPickupMethod: (m: PickupMethod) => void;
  setDropoffMethod: (m: PickupMethod) => void;

  setPickupAddress: (a: ShuttleAddress | null) => void;
  setDropoffAddress: (a: ShuttleAddress | null) => void;

  shuttleLoading: boolean;
  shuttleError: string | null;

  setShuttleLoading: (v: boolean) => void;
  setShuttleError: (v: string | null) => void;


  resetBooking: () => void;
}

/* =========================
   INITIAL STATE
========================= */
const initialState = {
  hydrated: false,

  selectedTrip: null,

  selectedSeats: [],

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

  pickupPointId: null,
  dropoffPointId: null,

  pickupMethod: "OFFICE" as PickupMethod,
  dropoffMethod: "OFFICE" as PickupMethod,

  pickupAddress: null,
  dropoffAddress: null,

  shuttleLoading: false,
  shuttleError: null,
};

/* =========================
   STORE
========================= */
export const useBookingStore = create<BookingStore>()(
  persist(
    (set) => ({
      ...initialState,

      // ================= HYDRATION =================
      setHydrated: (v) =>
        set({
          hydrated: v,
        }),

      // ================= TRIP =================
      setSelectedTrip: (trip) =>
        set({
          selectedTrip: trip,
        }),

      clearSelectedTrip: () =>
        set({
          selectedTrip: null,
        }),

      // ================= SEATS =================
      toggleSeat: (seat) =>
        set((state) => {
          const exists = state.selectedSeats.some(
            (s) => s.seatId === seat.seatId,
          );

          const selectedSeats = exists
            ? state.selectedSeats.filter((s) => s.seatId !== seat.seatId)
            : [...state.selectedSeats, seat];

          const subtotal = selectedSeats.reduce((sum, s) => sum + s.price, 0);

          return {
            selectedSeats,
            subtotal,
            totalPrice: Math.max(subtotal - state.promotionDiscount, 0),
          };
        }),

      clearSeats: () =>
        set({
          selectedSeats: [],
          subtotal: 0,
          totalPrice: 0,
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
      setPickupPoint: (pickupPointId) =>
        set({
          pickupPointId,
        }),

      setDropoffPoint: (dropoffPointId) =>
        set({
          dropoffPointId,
        }),

      setPickupMethod: (pickupMethod) =>
        set({
          pickupMethod,
        }),

      setDropoffMethod: (dropoffMethod) =>
        set({
          dropoffMethod,
        }),

      setPickupAddress: (pickupAddress) =>
        set({
          pickupAddress,
        }),

      setDropoffAddress: (dropoffAddress) =>
        set({
          dropoffAddress,
        }),

      // ================= SHUTTLE STATE =================
      setShuttleLoading: (v) =>
        set({
          shuttleLoading: v,
        }),

      setShuttleError: (v) =>
        set({
          shuttleError: v,
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
        selectedTrip: state.selectedTrip,
        selectedSeats: state.selectedSeats,

        subtotal: state.subtotal,
        promotionCode: state.promotionCode,
        promotionDiscount: state.promotionDiscount,
        totalPrice: state.totalPrice,

        passenger: state.passenger,

        pickupPointId: state.pickupPointId,
        dropoffPointId: state.dropoffPointId,

        pickupMethod: state.pickupMethod,
        dropoffMethod: state.dropoffMethod,

        pickupAddress: state.pickupAddress,
        dropoffAddress: state.dropoffAddress,
      }),
    },
  ),
);
