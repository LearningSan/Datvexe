export interface TripPickupPoint {
  pickupPointId: number;

  pointName: string;

  address: string;

  cityId: number;

  zoneId: number | null;
}