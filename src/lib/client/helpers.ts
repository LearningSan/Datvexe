export function formatCurrency(
    value: number
) {

    return new Intl.NumberFormat(
        "vi-VN"
    ).format(value);
}

export function getWeekday  (dateStr: string) {
  if (!dateStr) return "";

  const days = [
    "Chủ nhật",
    "Thứ 2",
    "Thứ 3",
    "Thứ 4",
    "Thứ 5",
    "Thứ 6",
    "Thứ 7",
  ];

  const date = new Date(dateStr);
  return days[date.getDay()];
};

export function formatDateTimeVN(dateString: string) {
  if (!dateString) return "";

  const date = new Date(dateString);

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
}