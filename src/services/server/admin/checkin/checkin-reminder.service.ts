import { withTransaction } from "@/lib/server/mysql";

import {
  acquireCheckinReminder,
  findCheckinReminderCandidates,
  markCheckinReminderFailed,
  markCheckinReminderSent,
  type CheckinReminderCandidateRow,
} from "@/repositories/admin/checkin/checkin-reminder.repo";

import { buildCheckinReminderMessage } from "@/services/server/admin/checkin/checkin-reminder-message.service";

import { dispatchInAppCheckinReminder } from "@/services/server/admin/checkin/checkin-reminder-dispatcher.service";

import type {
  CheckinReminderChannel,
  CheckinReminderChannelResult,
  CheckinReminderProcessItem,
  CheckinReminderType,
  ProcessCheckinRemindersResponse,
} from "@/types/admin/checkin/checkin-reminder.type";

const DEFAULT_BATCH_LIMIT = 100;
const MAX_BATCH_LIMIT = 500;

export async function processCheckinReminders(input?: {
  limit?: number;
}): Promise<ProcessCheckinRemindersResponse> {
  const limit = normalizeLimit(input?.limit);

  const candidateRows = await findCheckinReminderCandidates(limit);

  const candidates = Array.from(
    new Map(
      candidateRows.map((candidate) => [
        Number(candidate.bookingId),
        candidate,
      ]),
    ).values(),
  );

  console.log("[CHECKIN REMINDER CANDIDATES]", {
    rawCount: candidateRows.length,
    uniqueCount: candidates.length,
    items: candidates.map((candidate) => ({
      bookingId: candidate.bookingId,
      tripId: candidate.tripId,
      userId: candidate.userId,
    })),
  });

  const results: CheckinReminderProcessItem[] = [];

  let dueReminders = 0;
  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  for (const candidate of candidates) {
    const reminderType = determineReminderType(candidate.departureDatetime);

    if (!reminderType) {
      continue;
    }

    dueReminders += 1;

    const channelResult = await processReminderChannel({
      candidate,
      reminderType,
      channel: "IN_APP",
    });

    if (channelResult.status === "SENT") {
      sentCount += 1;
    } else if (channelResult.status === "FAILED") {
      failedCount += 1;
    } else {
      skippedCount += 1;
    }

    results.push({
      bookingId: Number(candidate.bookingId),
      tripId: Number(candidate.tripId),
      reminderType,
      channels: [channelResult],
    });
  }

  return {
    success: true,

    scannedBookings: candidates.length,
    dueReminders,

    sentCount,
    failedCount,
    skippedCount,

    results,
  };
}

async function processReminderChannel(input: {
  candidate: CheckinReminderCandidateRow;

  reminderType: CheckinReminderType;

  channel: CheckinReminderChannel;
}): Promise<CheckinReminderChannelResult> {
  const bookingId = Number(input.candidate.bookingId);
  const tripId = Number(input.candidate.tripId);

  const userId = Number(input.candidate.userId);
  if (!Number.isInteger(userId) || userId <= 0) {
    return {
      channel: input.channel,
      status: "SKIPPED",
      message: "Booking không có tài khoản user",
    };
  }
  const reservation = await withTransaction(async (conn) =>
    acquireCheckinReminder(conn, {
      bookingId,
      tripId,
      userId,
      reminderType: input.reminderType,
      channel: input.channel,
    }),
  );

  if (!reservation.acquired || !reservation.checkinReminderId) {
    return {
      channel: input.channel,
      status: "SKIPPED",

      message: reservation.reason ?? "Reminder đã được xử lý",
    };
  }

  try {
    const message = buildCheckinReminderMessage(
      input.candidate,
      input.reminderType,
    );

    await dispatchInAppCheckinReminder({
      candidate: input.candidate,
      reminderType: input.reminderType,
      message,
    });

    await markCheckinReminderSent(reservation.checkinReminderId);

    return {
      channel: input.channel,
      status: "SENT",
    };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Không thể gửi thông báo nhắc check-in";

    try {
      await markCheckinReminderFailed(
        reservation.checkinReminderId,
        errorMessage,
      );
    } catch (markError) {
      console.error("[MARK CHECKIN REMINDER FAILED ERROR]", markError);
    }

    return {
      channel: input.channel,
      status: "FAILED",
      message: errorMessage,
    };
  }
}

function determineReminderType(
  departureDatetime: string | Date,
): CheckinReminderType | null {
  const departureTimestamp = new Date(departureDatetime).getTime();

  if (!Number.isFinite(departureTimestamp)) {
    return null;
  }

  const remainingMinutes = (departureTimestamp - Date.now()) / (60 * 1000);

  if (remainingMinutes > 30 && remainingMinutes <= 60) {
    return "REMINDER_60";
  }

  if (remainingMinutes > 15 && remainingMinutes <= 30) {
    return "REMINDER_30";
  }

  if (remainingMinutes > 0 && remainingMinutes <= 15) {
    return "REMINDER_15";
  }

  return null;
}

function normalizeLimit(value?: number): number {
  if (value == null || !Number.isInteger(value) || value <= 0) {
    return DEFAULT_BATCH_LIMIT;
  }

  return Math.min(value, MAX_BATCH_LIMIT);
}
