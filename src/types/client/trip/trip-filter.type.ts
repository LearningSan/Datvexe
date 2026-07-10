export type SortField = "price" | "departure" | "availableSeats";

export type SortOrder = "asc" | "desc";

export interface TripSearchFilters {
  originCityId: number ;
  destinationCityId: number ;
  date: string;

  page: number;
  limit: number;

  timeSlots: string[];
  vehicleTypes: string[];
  seatPositions: string[];
  floors: string[];

  sort: {
    field: "price" | "departure" | "availableSeats";
    order: "asc" | "desc";
  };

  onlyAvailable: boolean;
}
