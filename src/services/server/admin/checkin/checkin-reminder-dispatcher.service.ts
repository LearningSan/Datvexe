import { withTransaction } from "@/lib/server/mysql";

import { createNotification } from "@/repositories/client/notification.repo";

import type { CheckinReminderCandidateRow } from "@/repositories/admin/checkin/checkin-reminder.repo";

import type { CheckinReminderType } from "@/types/admin/checkin/checkin-reminder.type";

import type { CheckinReminderMessage } from "@/services/server/admin/checkin/checkin-reminder-message.service";

export async function dispatchInAppCheckinReminder(input: {
  candidate: CheckinReminderCandidateRow;

  reminderType: CheckinReminderType;

  message: CheckinReminderMessage;
}): Promise<void> {
  const userId = Number(input.candidate.userId);

  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error("Booking không có tài khoản user nhận thông báo");
  }

  await withTransaction(async (conn) => {
    await createNotification(conn, {
      userId,

      title: input.message.title,

      content: input.message.content,

      type: "CHECKIN",
    });
  });
}
