export type HoldSeatsPayload = {
  tripId: number;

  seatLayoutDetailIds: number[];

  sessionId: string;
};

export type HoldSeatsResponse = {
  tripId: number;

  seatCount: number;

  expiresIn: number;
};