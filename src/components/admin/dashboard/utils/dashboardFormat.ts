export const getLocalDateString = (date: Date) => {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().split("T")[0];
};

export const formatChartDate = (value: string) => {
  if (!value) return "";

  const date = new Date(value);

  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  });
};

export const formatMoney = (value: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value || 0);
};

export const formatDateTime = (value: string) => {
  if (!value) return "---";

  const date = new Date(value);

  return (
    date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    }) +
    " · " +
    date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
    })
  );
};

export const formatCompactMoney = (value: number) => {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} tỷ`;

  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} triệu`;

  return formatMoney(value);
};

export function formatAxisMoney(value?: number | null) {
  const num = Number(value || 0);

  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toLocaleString("vi-VN", {
      maximumFractionDigits: 1,
    })} tỷ`;
  }

  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toLocaleString("vi-VN", {
      maximumFractionDigits: 1,
    })} triệu`;
  }

  if (num >= 1_000) {
    return `${(num / 1_000).toLocaleString("vi-VN", {
      maximumFractionDigits: 1,
    })} nghìn`;
  }

  return `${num.toLocaleString("vi-VN")} đ`;
}
export function formatMoneyCompact(value?: number | null) {
  if (!value) return "0 đ";

  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)} tỷ`;
  }

  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)} triệu`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)} nghìn`;
  }

  return `${value.toLocaleString("vi-VN")} đ`;
}
