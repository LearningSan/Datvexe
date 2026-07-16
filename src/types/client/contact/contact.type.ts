export type ContactSubject =
  | "SERVICE_FEEDBACK"
  | "LOST_LUGGAGE"
  | "COMPLAINT"
  | "BOOKING_SUPPORT"
  | "BUSINESS_PARTNERSHIP"
  | "OTHER";

export interface ContactFormPayload {
  fullName: string;
  email: string;
  phone: string;
  subject: ContactSubject;
  message: string;
}
