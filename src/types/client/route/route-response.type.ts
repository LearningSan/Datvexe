import {
  City,
  Zone,
  PickupPoint,
  PopularRoute,
} from "./route.type";

export type CityResponse = City[];

export type ZoneResponse = Zone[];

export type PickupPointResponse = PickupPoint[];

export type PopularRouteResponse = PopularRoute[];
export interface PickupPointMatchResponse {
  pickupPointId: number | null;
}