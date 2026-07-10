import { TripSeatResponse } from "./seat-response.type";

export type TripSeatMeta = Omit<TripSeatResponse, "seats">;
