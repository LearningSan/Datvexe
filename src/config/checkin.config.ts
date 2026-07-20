import type {
  CheckinTimeConfiguration,
} from "@/types/admin/checkin/checkin-operation.type";

export const CHECKIN_TIME_CONFIG: CheckinTimeConfiguration = {
  /*
   * Mở check-in trước giờ khởi hành 120 phút.
   */
  openBeforeMinutes: 120,

  /*
   * Bắt đầu gửi nhắc khi còn 60 phút.
   */
  reminderBeforeMinutes: 60,

  /*
   * Cảnh báo nhân viên khi còn 30 phút.
   */
  warningBeforeMinutes: 30,

  /*
   * Cảnh báo khẩn khi còn 15 phút.
   */
  criticalBeforeMinutes: 15,

  /*
   * Cho phép xử lý khách tới trễ trong 15 phút
   * sau giờ khởi hành.
   */
  graceAfterMinutes: 15,
};