"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import html2canvas from "html2canvas";

import { useTicketDetail } from "@/hooks/client/useAccount";
import {
  useCancelTicket,
  useCancelTicketPreview,
} from "@/hooks/client/useTicketAction";
import BlockSkeleton from "@/components/common/BlockSkeleton";
import styles from "./TicketDetailModal.module.css";

interface Props {
  bookingId: number;
  onClose: () => void;
  redirectTo?: string;
}

function formatPaymentStatus(status?: string | null) {
  if (status === "PAID") return "Đã thanh toán";
  if (status === "FAILED") return "Thất bại";
  if (status === "REFUNDED") return "Đã hoàn tiền";
  if (status === "PENDING") return "Đang chờ";
  return "—";
}

function formatPaymentMethod(method?: string | null) {
  if (method === "MOMO") return "MoMo";
  if (method === "ZALOPAY") return "ZaloPay";
  if (method === "VNPAY") return "VNPay";
  if (method === "VIETQR") return "VietQR";
  if (method === "CASH") return "Thanh toán tại quầy";
  if (method === "PAYOS") return "PayOS";
  if (method === "INTERNAL_WALLET") return "Ví nội bộ";
  return "—";
}

export default function TicketDetailModal({
  bookingId,
  onClose,
  redirectTo = "/account/tickets",
}: Props) {
  const router = useRouter();
  const { data, isLoading } = useTicketDetail(bookingId);
  const ticketRef = useRef<HTMLDivElement>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const cancelMutation = useCancelTicket();
  const cancelPreview = useCancelTicketPreview(bookingId, showCancelConfirm);

  const handleCancelTicket = async () => {
    if (!bookingId) return;

    try {
      const result = await cancelMutation.mutateAsync(bookingId);
      toast.success(result.message || "Hủy vé thành công");
      setShowCancelConfirm(false);
      onClose();

      // Thực hiện chuyển hướng trang sau khi hủy vé thành công
      router.push(redirectTo);
      router.refresh();
    } catch (error: any) {
      const message = error?.response?.data?.message || "Không thể hủy vé";
      toast.error(message);
    }
  };

  const handleDownloadTicket = async () => {
    try {
      if (!ticketRef.current || !data) return;

      const canvas = await html2canvas(ticketRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
        scrollX: 0,
        scrollY: 0,
      });

      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = `ve-xe-${data.bookingCode}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("DOWNLOAD TICKET ERROR", error);
    }
  };

  const getStatusClassName = (status?: string | null) => {
    if (status === "PAID" || status === "CONFIRMED") return styles.statusPaid;
    if (status === "FAILED" || status === "CANCELLED")
      return styles.statusFailed;
    return styles.statusPending;
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button
          className={styles.closeBtn}
          onClick={onClose}
          type="button"
          aria-label="Close modal"
        >
          &times;
        </button>

        <h2 className={styles.title}>Chi Tiết Vé Xe</h2>

        {isLoading ? (
          <div className={styles.content}>
            <BlockSkeleton height={450} />
          </div>
        ) : !data ? (
          <div className={styles.emptyContent}>
            <p>Không tìm thấy thông tin vé hoặc đã có lỗi xảy ra.</p>
          </div>
        ) : (
          <>
            <div className={styles.scrollContainer}>
              <div className={styles.ticketCaptureArea} ref={ticketRef}>
                {/* SECTION 1: CHUYẾN ĐI */}
                <section className={styles.section}>
                  <h3>Thông tin chuyến đi</h3>
                  <div className={styles.grid}>
                    <div className={styles.row}>
                      <span>Mã đặt vé</span>
                      <strong className={styles.bookingCode}>
                        {data.bookingCode}
                      </strong>
                    </div>
                    <div className={styles.row}>
                      <span>Trạng thái vé</span>
                      <span
                        className={`${styles.badge} ${getStatusClassName(
                          data.bookingStatus,
                        )}`}
                      >
                        {data.bookingStatus}
                      </span>
                    </div>
                    <div className={styles.row}>
                      <span>Tuyến xe</span>
                      <strong>{data.routeName}</strong>
                    </div>
                    <div className={styles.row}>
                      <span>Loại xe</span>
                      <strong>{data.vehicleTypeName}</strong>
                    </div>
                    <div className={styles.row}>
                      <span>Tên xe</span>
                      <strong>{data.vehicleName || "—"}</strong>
                    </div>
                    <div className={styles.row}>
                      <span>Biển số</span>
                      <strong>{data.licensePlate || "—"}</strong>
                    </div>
                    <div className={styles.row}>
                      <span>Trạng thái chuyến</span>
                      <strong>{data.tripStatus || "—"}</strong>
                    </div>
                    <div className={styles.row}>
                      <span>Khởi hành</span>
                      <strong className={styles.timeHighlight}>
                        {data.departureDatetime}
                      </strong>
                    </div>
                    <div className={styles.row}>
                      <span>Đến dự kiến</span>
                      <strong>{data.arrivalDatetime}</strong>
                    </div>
                  </div>
                </section>

                {/* SECTION 2: GHẾ & HÀNH KHÁCH */}
                <div className={styles.twoColumnGrid}>
                  <section className={styles.section}>
                    <h3>Thông tin ghế</h3>
                    <div className={styles.row}>
                      <span>Ghế đã chọn</span>
                      <strong className={styles.seatHighlight}>
                        {data.seatNumbers?.length
                          ? data.seatNumbers.join(", ")
                          : "—"}
                      </strong>
                    </div>
                    <div className={styles.row}>
                      <span>Số lượng ghế</span>
                      <strong>{data.seatCount} vé</strong>
                    </div>
                    <div className={styles.row}>
                      <span>Giá vé</span>
                      <strong>
                        {Number(data.ticketPrice).toLocaleString("vi-VN")}đ
                      </strong>
                    </div>
                    <div className={styles.row}>
                      <span>Giá niêm yết</span>
                      <strong>
                        {data.tripTicketPrice
                          ? Number(data.tripTicketPrice).toLocaleString(
                              "vi-VN",
                            ) + "đ"
                          : "—"}
                      </strong>
                    </div>
                  </section>

                  <section className={styles.section}>
                    <h3>Thông tin hành khách</h3>
                    <div className={styles.row}>
                      <span>Họ tên</span>
                      <strong>{data.passengerName}</strong>
                    </div>
                    <div className={styles.row}>
                      <span>Số điện thoại</span>
                      <strong>{data.passengerPhone}</strong>
                    </div>
                    <div className={styles.row}>
                      <span>Email</span>
                      <strong className={styles.truncate}>
                        {data.passengerEmail || "—"}
                      </strong>
                    </div>
                  </section>
                </div>

                {/* SECTION 3: ĐÓN TRẢ */}
                <section className={styles.section}>
                  <h3>Điểm đón / trả</h3>
                  <div className={styles.grid} style={{ marginBottom: "12px" }}>
                    <div className={styles.row}>
                      <span>Hình thức đón</span>
                      <strong>
                        {data.pickupMethod === "SHUTTLE"
                          ? "Trung chuyển"
                          : "Đón tại văn phòng"}
                      </strong>
                    </div>
                    <div className={styles.row}>
                      <span>Hình thức trả</span>
                      <strong>
                        {data.dropoffMethod === "SHUTTLE"
                          ? "Trung chuyển"
                          : "Trả tại văn phòng"}
                      </strong>
                    </div>
                  </div>

                  <div className={styles.routeTimeline}>
                    <div className={styles.timelineItem}>
                      <div className={styles.timelineDot} />
                      <div className={styles.timelineContent}>
                        <span>
                          Điểm đón:{" "}
                          <strong>{data.pickupPointName || "—"}</strong>
                        </span>
                        <p>{data.pickupPointAddress || "—"}</p>
                      </div>
                    </div>
                    <div className={styles.timelineItem}>
                      <div
                        className={`${styles.timelineDot} ${styles.dotEnd}`}
                      />
                      <div className={styles.timelineContent}>
                        <span>
                          Điểm trả:{" "}
                          <strong>{data.dropoffPointName || "—"}</strong>
                        </span>
                        <p>{data.dropoffPointAddress || "—"}</p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* SECTION 4: CHI TIẾT HÓA ĐƠN */}
                <section className={styles.section}>
                  <h3>Chi tiết thanh toán</h3>
                  <div className={styles.row}>
                    <span>Tạm tính ({data.seatCount} ghế)</span>
                    <strong>
                      {Number(data.subtotalAmount).toLocaleString("vi-VN")}đ
                    </strong>
                  </div>
                  <div className={styles.row}>
                    <span>Giá vé / ghế</span>
                    <strong>
                      {Number(data.ticketPrice).toLocaleString("vi-VN")}đ
                    </strong>
                  </div>
                  <div className={styles.row}>
                    <span>Khấu trừ giảm giá</span>
                    <strong className={styles.discountText}>
                      -{Number(data.discountAmount).toLocaleString("vi-VN")}đ
                    </strong>
                  </div>
                  <div className={styles.totalRow}>
                    <span>Tổng chi phí thanh toán</span>
                    <span className={styles.totalPrice}>
                      {Number(data.totalAmount).toLocaleString("vi-VN")}đ
                    </span>
                  </div>
                </section>

                {/* SECTION 5: LỊCH SỬ GIAO DỊCH */}
                <section className={styles.section}>
                  <h3>Lịch sử giao dịch</h3>
                  <div className={styles.grid}>
                    <div className={styles.row}>
                      <span>Mã giao dịch</span>
                      <strong className={styles.codeText}>
                        {data.transactionCode || "—"}
                      </strong>
                    </div>
                    <div className={styles.row}>
                      <span>Phương thức</span>
                      <strong>{formatPaymentMethod(data.paymentMethod)}</strong>
                    </div>
                    <div className={styles.row}>
                      <span>Trạng thái</span>
                      <strong
                        className={getStatusClassName(data.paymentStatus)}
                      >
                        {formatPaymentStatus(data.paymentStatus)}
                      </strong>
                    </div>
                    <div className={styles.row}>
                      <span>Thời gian</span>
                      <strong>{data.paidAt || "—"}</strong>
                    </div>
                    {data.bookingStatus === "CANCELLED" && (
                      <div
                        className={styles.row}
                        style={{ gridColumn: "1 / -1" }}
                      >
                        <span>Lý do hủy</span>
                        <strong style={{ color: "#ef4444" }}>
                          {data.cancelReason || "—"}
                        </strong>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>

            {/* Nút chức năng chân modal */}
            <div className={styles.actionRow}>
              <button
                type="button"
                className={styles.printBtn}
                onClick={handleDownloadTicket}
              >
                📥 Tải xuống vé điện tử
              </button>

              {data.bookingStatus === "CONFIRMED" && (
                <button
                  type="button"
                  className={styles.cancelBtn}
                  disabled={cancelMutation.isPending}
                  onClick={() => setShowCancelConfirm(true)}
                >
                  Hủy vé
                </button>
              )}
            </div>

            {/* Modal Xác nhận Hủy vé - Đã khớp chính xác 100% tên Class & Thẻ trong CSS */}
            {showCancelConfirm && (
              <div className={styles.confirmOverlay}>
                {" "}
                <div className={styles.confirmBox}>
                  {" "}
                  <h4 className={styles.confirmTitle}>
                    {" "}
                    Xác nhận hủy vé{" "}
                  </h4>{" "}
                  <p className={styles.confirmText}>
                    {" "}
                    Bạn có chắc chắn muốn hủy vé này?{" "}
                  </p>{" "}
                  {/* LUÔN HIỂN THỊ LINK CHÍNH SÁCH */}{" "}
                  <a
                    href="/cancellation-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.policyLink}
                  >
                    {" "}
                    Xem chính sách hủy vé & hoàn tiền{" "}
                  </a>{" "}
                  {cancelPreview.isLoading ? (
                    <div className={styles.confirmLoading}>
                      {" "}
                      Đang tính tiền hoàn...{" "}
                    </div>
                  ) : cancelPreview.isError ? (
                    <div className={styles.confirmError}>
                      {" "}
                      Không thể kiểm tra chính sách hoàn tiền.{" "}
                    </div>
                  ) : cancelPreview.data ? (
                    <div className={styles.previewInfo}>
                      {" "}
                      <div className={styles.previewRow}>
                        {" "}
                        <span>Phí hủy:</span>{" "}
                        <strong>
                          {" "}
                          {cancelPreview.data.cancelFeePercent}%{" "}
                        </strong>{" "}
                      </div>{" "}
                      <div className={styles.previewRow}>
                        {" "}
                        <span>Tiền hoàn:</span>{" "}
                        <strong className={styles.refundAmount}>
                          {" "}
                          {Number(
                            cancelPreview.data.refundAmount,
                          ).toLocaleString("vi-VN")}{" "}
                          đ{" "}
                        </strong>{" "}
                      </div>{" "}
                      {cancelPreview.data.refundAmount > 0 ? (
                        <div className={styles.policyNotice}>
                          {" "}
                          <p>
                            {" "}
                            Số tiền hoàn sẽ được chuyển vào{" "}
                            <strong>ví nội bộ</strong> theo chính sách hủy
                            vé.{" "}
                          </p>{" "}
                          <p>
                            {" "}
                            Sau khi hủy thành công, vui lòng kiểm tra ví nội bộ
                            để xác nhận khoản tiền hoàn.{" "}
                          </p>{" "}
                        </div>
                      ) : (
                        <div className={styles.policyNotice}>
                          {" "}
                          <p>
                            {" "}
                            Vé đủ điều kiện hủy nhưng không có tiền hoàn theo
                            chính sách hiện tại.{" "}
                          </p>{" "}
                        </div>
                      )}{" "}
                    </div>
                  ) : null}{" "}
                  <div className={styles.confirmActions}>
                    {" "}
                    <button
                      type="button"
                      className={styles.cancelModalBtn}
                      onClick={() => setShowCancelConfirm(false)}
                    >
                      {" "}
                      Không{" "}
                    </button>{" "}
                    <button
                      type="button"
                      className={styles.submitModalBtn}
                      disabled={
                        cancelMutation.isPending ||
                        cancelPreview.isLoading ||
                        cancelPreview.isError ||
                        !cancelPreview.data
                      }
                      onClick={handleCancelTicket}
                    >
                      {" "}
                      {cancelMutation.isPending
                        ? "Đang hủy..."
                        : "Xác nhận hủy"}{" "}
                    </button>{" "}
                  </div>{" "}
                </div>{" "}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
