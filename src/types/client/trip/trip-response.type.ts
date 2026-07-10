import type { Trip } from "./trip.type";

export interface TripPagination {
  page: number;

  limit: number;

  total: number;

  totalPages: number;
}

export interface SearchTripsResponse {
  trips: Trip[];

  pagination: TripPagination;
}