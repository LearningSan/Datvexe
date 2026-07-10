export type SortField = "price" | "departure" | "availableSeats";

export type SortOrder = "asc" | "desc";

export interface TripSearchFilters {
  originCityId: number | null;
  destinationCityId: number | null;
  date: string;

  page: number;
  limit: number;

  timeSlots: string[];
  vehicleTypes: string[];
  seatPositions: string[];
  floors: string[];

  sort: {
    field: SortField;
    order: SortOrder;
  };

  onlyAvailable: boolean;
}