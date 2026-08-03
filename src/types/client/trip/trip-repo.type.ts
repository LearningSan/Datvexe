export interface SearchTripsRepoInput {
  origin: number;
  destination: number;
  date: string;
  requiredSeats?: number;
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

  onlyAvailable?: boolean;
}
