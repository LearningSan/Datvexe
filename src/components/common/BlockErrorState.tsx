"use client";

interface BlockErrorStateProps {
  title?: string;
  message?: string;
  height?: number;
  onRetry?: () => void;
}

export default function BlockErrorState({
  title = "Không thể tải nội dung",
  message = "Khu vực này tạm thời không khả dụng.",
  height = 180,
  onRetry,
}: BlockErrorStateProps) {
  return (
    <div
      role="alert"
      style={{
        minHeight: height,
        width: "100%",
        padding: 24,
        display: "grid",
        placeItems: "center",
        borderRadius: 16,
        border: "1px solid #fecaca",
        background: "#fff7f7",
        textAlign: "center",
      }}
    >
      <div>
        <div
          style={{
            marginBottom: 8,
            color: "#991b1b",
            fontSize: 18,
            fontWeight: 700,
          }}
        >
          {title}
        </div>

        <div
          style={{
            color: "#b42318",
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          {message}
        </div>

        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            style={{
              marginTop: 16,
              padding: "10px 18px",
              border: 0,
              borderRadius: 10,
              background: "#b42318",
              color: "#ffffff",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Thử lại
          </button>
        )}
      </div>
    </div>
  );
}
