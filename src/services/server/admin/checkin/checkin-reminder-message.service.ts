import type { CheckinReminderCandidateRow } from "@/repositories/admin/checkin/checkin-reminder.repo";

import type { CheckinReminderType } from "@/types/admin/checkin/checkin-reminder.type";

export interface CheckinReminderMessage {
  title: string;
  content: string;
}

export function buildCheckinReminderMessage(
  candidate: CheckinReminderCandidateRow,
  reminderType: CheckinReminderType,
): CheckinReminderMessage {
  const routeName = `${candidate.originName} → ${candidate.destinationName}`;

  const departureText = new Date(candidate.departureDatetime).toLocaleString(
    "vi-VN",
    {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  );

  const pickupText = candidate.pickupPointName
    ? `📍 Điểm đón: ${candidate.pickupPointName}${
        candidate.pickupPointAddress ? ` - ${candidate.pickupPointAddress}` : ""
      }`
    : "";

  const seatText = candidate.seatNumbers
    ? `💺 Ghế: ${candidate.seatNumbers}`
    : "";

  switch (reminderType) {
    case "REMINDER_60":
      return {
        title: "Chuyến xe sẽ khởi hành sau khoảng 60 phút",
        content: joinMessageParts([
          `🎫 Vé: ${candidate.bookingCodes}`,
          `🚌 Chuyến: ${routeName}`,
          `⏰ Khởi hành: ${departureText}`,
          pickupText,
          seatText,
          "👉 Vui lòng đến điểm đón sớm để chuẩn bị lên xe.",
        ]),
      };

    case "REMINDER_30":
      return {
        title: "Chuyến xe sẽ khởi hành sau khoảng 30 phút",
        content: joinMessageParts([
          `🎫 Vé: ${candidate.bookingCodes}`,
          `🚌 Chuyến: ${routeName}`,
          `⏰ Khởi hành: ${departureText}`,
          pickupText,
          seatText,
          "👉 Vui lòng đến điểm đón và chuẩn bị sẵn mã QR check-in.",
        ]),
      };

    case "REMINDER_15":
      return {
        title: "Chuyến xe sắp khởi hành",
        content: joinMessageParts([
          `🎫 Vé: ${candidate.bookingCodes}`,
          `🚌 Chuyến: ${routeName}`,
          `⏰ Khởi hành: ${departureText}`,
          pickupText,
          seatText,
          "🚨 Vui lòng đến vị trí lên xe và thực hiện check-in ngay.",
        ]),
      };
  }
}

function joinMessageParts(parts: string[]): string {
  return parts
    .map((part) => part.trim())
    .filter(Boolean)
    .join("\n"); // Xuống dòng bằng \n
}
