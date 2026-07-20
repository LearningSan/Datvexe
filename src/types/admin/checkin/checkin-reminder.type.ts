export type CheckinReminderType =
  | "REMINDER_60"
  | "REMINDER_30"
  | "REMINDER_15";

export type CheckinReminderChannel = "IN_APP" | "EMAIL";

export type CheckinReminderStatus =
  | "PROCESSING"
  | "SENT"
  | "FAILED";

export interface CheckinReminderChannelResult {
  channel: CheckinReminderChannel;

  status:
    | "SENT"
    | "FAILED"
    | "SKIPPED";

  message?: string;
}

export interface CheckinReminderProcessItem {
  bookingId: number;
  tripId: number;
  reminderType: CheckinReminderType;

  channels: CheckinReminderChannelResult[];
}

export interface ProcessCheckinRemindersResponse {
  success: true;

  scannedBookings: number;
  dueReminders: number;

  sentCount: number;
  failedCount: number;
  skippedCount: number;

  results: CheckinReminderProcessItem[];
}