type NoShowNotificationInput = {
  departureDatetime: string | Date;
  bookingCodes: string[];
  seatNumbers: string[];
};

export function buildNoShowNotificationMessage(input: NoShowNotificationInput) {
  const departureText = formatDateTime(input.departureDatetime);

  const bookingText =
    input.bookingCodes.length > 0
      ? input.bookingCodes.join(", ")
      : "Không xác định";

  const seatText =
    input.seatNumbers.length > 0
      ? input.seatNumbers.join(", ")
      : "Không xác định";

  // Sử dụng mảng và nối bằng dấu xuống dòng \n để đồng bộ layout với UI mới
  const contentParts = [
    `🎫 Vé: ${bookingText}`,
    `💺 Ghế: ${seatText}`,
    `⏰ Giờ khởi hành gốc: ${departureText}`,
    `❌ Trạng thái: Hệ thống ghi nhận vắng mặt (No-Show) do hành khách chưa thực hiện check-in sau thời gian gia hạn. Chuyến xe đã khởi hành.`,
  ];

  return {
    title: "Đã quá thời gian check-in",
    content: contentParts.join("\n"),
  };
}

function formatDateTime(value: string | Date): string {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "không xác định";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh", // Thêm múi giờ Việt Nam để đồng bộ hoàn toàn với hàm check-in cũ
  }).format(date);
}
