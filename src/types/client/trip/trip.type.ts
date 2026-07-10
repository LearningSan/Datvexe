export interface Trip {
  id: number;

  originCity: string;
  destinationCity: string;

  departureTime: string;
  arrivalTime: string;

  departureDateTime: string;
  arrivalDateTime: string;

  duration: number;
  distance: number;

  availableSeats: number;
  type: string;
  floorCount: number;
  price: number;

  vehicleName: string;
  licensePlate: string;

  imageUrl: string | null;

  status: string;
}
