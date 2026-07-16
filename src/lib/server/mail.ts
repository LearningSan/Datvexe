import nodemailer from "nodemailer";
import { formatDateTimeVN } from "@/lib/client/helpers";
export async function sendRegisterOtpEmail(to: string, otp: string) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST!,
    port: Number(process.env.SMTP_PORT || 465),
    secure: true,
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASS!,
    },
  });

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Mã OTP xác thực XeKhachPT</title>
    </head>

    <body style="margin: 0; padding: 0; background-color: #f6f9fc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; -webkit-font-smoothing: antialiased;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #f6f9fc; padding: 40px 0;">
        <tr>
          <td align="center">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 500px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
              
              <tr>
                <td align="center" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 32px 20px;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 700; letter-spacing: 1px;">XeKhachPT</h1>
                  <p style="margin: 6px 0 0 0; color: #fecaca; font-size: 14px;">Hành trình an toàn - Dịch vụ trọn vẹn</p>
                </td>
              </tr>

              <tr>
                <td style="padding: 40px 32px; color: #334155;">
                  <h2 style="margin: 0 0 16px 0; font-size: 20px; color: #1e293b; font-weight: 600;">
                    Mã Xác Thực Đăng Ký (OTP)
                  </h2>
                  
                  <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #475569;">
                    Chào bạn,<br><br>
                    Cảm ơn bạn đã lựa chọn đăng ký tài khoản tại <strong>XeKhachPT</strong>. Vui lòng sử dụng mã số bên dưới để hoàn tất việc xác thực thông tin:
                  </p>

                  <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 32px auto;">
                    <tr>
                      <td align="center" style="background-color: #fef2f2; border: 1px dashed #fca5a5; border-radius: 12px; padding: 16px 36px;">
                        <span style="color: #dc2626; font-size: 36px; font-weight: 800; font-family: 'Courier New', Courier, monospace; letter-spacing: 4px; display: block;">${otp}</span>
                      </td>
                    </tr>
                  </table>

                  <div style="background-color: #f8fafc; border-left: 4px solid #94a3b8; padding: 12px 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
                    <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #64748b;">
                      💡 <strong>Mẹo bảo mật:</strong> Mã OTP có hiệu lực trong vòng <strong>30 phút</strong>. Tuyệt đối không chia sẻ mã này cho bất kỳ ai, kể cả nhân viên tổng đài XeKhachPT.
                    </p>
                  </div>

                  <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0 24px 0;">

                  <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #94a3b8; text-align: center;">
                    Nếu bạn không thực hiện yêu cầu này, hệ thống sẽ tự hủy mã. Bạn có thể an tâm bỏ qua email này.
                  </p>
                </td>
              </tr>

              <tr>
                <td style="padding: 0 32px 32px 32px; background-color: #ffffff; text-align: center;">
                  <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                    Đây là email tự động từ hệ thống quản lý chuyến xe.<br>
                    © ${new Date().getFullYear()} XeKhachPT. All rights reserved.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: process.env.MAIL_FROM!,
    to,
    subject: "🔐 Mã OTP xác thực tài khoản XeKhachPT",
    html: emailHtml,
  });
}
export async function sendPaymentSuccessEmail(data: {
  to: string;
  customerName: string;
  customerPhone: string | null;
  bookingCode: string;
  amount: number;

  routeName: string;
  departureDatetime: string;
  arrivalDatetime: string;

  pickupPointName: string | null;
  pickupPointAddress: string | null;
  dropoffPointName: string | null;
  dropoffPointAddress: string | null;

  vehicleName: string | null;
  licensePlate: string | null;
  seatNumbers: string | null;
}) {
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    data.bookingCode,
  )}`;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST!,
    port: Number(process.env.SMTP_PORT || 465),
    secure: true,
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASS!,
    },
  });

  const formattedAmount = Number(data.amount).toLocaleString("vi-VN") + " đ";

  try {
    const info = await transporter.sendMail({
      from: `"XeKhachPT" <${process.env.MAIL_FROM!}>`,
      to: data.to,
      subject: `[XeKhachPT] Xác nhận đặt vé thành công - Mã vé: ${data.bookingCode}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Xác nhận thanh toán thành công</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; -webkit-font-smoothing: antialiased;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
            <tr>
              <td align="center" style="padding: 30px 10px;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                  
                  <!-- Brand Header -->
                  <tr>
                    <td align="center" style="background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%); padding: 35px 20px; color: #ffffff;">
                      <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 0.5px;">XeKhachPT</h1>
                      <div style="margin-top: 12px; display: inline-block; background-color: rgba(255, 255, 255, 0.15); padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: 500;">
                        Vé Điện Tử Đã Thanh Toán
                      </div>
                    </td>
                  </tr>

                  <!-- Main Content -->
                  <tr>
                    <td style="padding: 35px 30px 20px 30px;">
                      <p style="margin: 0 0 16px 0; font-size: 16px; color: #1e293b; line-height: 1.6;">
                        Xin chào <strong>${data.customerName}</strong>,
                      </p>
                      <p style="margin: 0 0 25px 0; font-size: 15px; color: #475569; line-height: 1.6;">
                        Cảm ơn bạn đã lựa chọn <strong>XeKhachPT</strong>. Giao dịch của bạn đã hoàn tất thành công. Dưới đây là thông tin chi tiết hành trình và mã vé điện tử của bạn:
                      </p>

                      <!-- Ticket Summary Box -->
                      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 25px;">
                        <tr>
                          <td style="padding-bottom: 14px; border-bottom: 1px dashed #cbd5e1; font-size: 13px; color: #64748b; font-weight: 700; letter-spacing: 0.5px;">
                            THÔNG TIN THANH TOÁN
                          </td>
                        </tr>
                        <tr>
                          <td style="padding-top: 14px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                              <tr>
                                <td style="padding: 5px 0; font-size: 14px; color: #64748b;" width="35%">Mã đặt vé:</td>
                                <td style="padding: 5px 0; font-size: 16px; color: #1d4ed8; font-weight: 700; letter-spacing: 0.5px;">${data.bookingCode}</td>
                              </tr>
                              <tr>
                                <td style="padding: 5px 0; font-size: 14px; color: #64748b;">Số tiền:</td>
                                <td style="padding: 5px 0; font-size: 16px; color: #ef4444; font-weight: 700;">${formattedAmount}</td>
                              </tr>
                              <tr>
                                <td style="padding: 5px 0; font-size: 14px; color: #64748b;">Trạng thái:</td>
                                <td style="padding: 5px 0; font-size: 13px; color: #16a34a; font-weight: 600;">
                                  <span style="background-color: #dcfce7; padding: 2px 8px; border-radius: 4px;">Thành công</span>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>

                      <!-- Trip Details Box -->
                      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 25px;">
                        <tr>
                          <td style="padding-bottom: 14px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #64748b; font-weight: 700; letter-spacing: 0.5px;">
                            CHI TIẾT CHUYẾN ĐI
                          </td>
                        </tr>
                        <tr>
                          <td style="padding-top: 14px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                              <tr>
                                <td style="padding: 7px 0; font-size: 14px; color: #64748b;" width="35%" valign="top">Tuyến xe:</td>
                                <td style="padding: 7px 0; font-size: 15px; color: #0f172a; font-weight: 600;">${data.routeName}</td>
                              </tr>
                              <tr>
                                <td style="padding: 7px 0; font-size: 14px; color: #64748b;" valign="top">Khởi hành:</td>
                                <td style="padding: 7px 0; font-size: 14px; color: #0f172a; font-weight: 500;">${formatDateTimeVN(data.departureDatetime)}</td>
                              </tr>
                              <tr>
                                <td style="padding: 7px 0; font-size: 14px; color: #64748b;" valign="top">Dự kiến đến:</td>
                                <td style="padding: 7px 0; font-size: 14px; color: #475569;">${formatDateTimeVN(data.arrivalDatetime)}</td>
                              </tr>
                              <tr>
                                <td style="padding: 7px 0; font-size: 14px; color: #64748b;" valign="top">Vị trí ghế:</td>
                                <td style="padding: 7px 0; font-size: 14px; color: #0f172a; font-weight: 600;">${data.seatNumbers || "Hệ thống tự động xếp ghế"}</td>
                              </tr>
                              <tr>
                                <td style="padding: 7px 0; font-size: 14px; color: #64748b;" valign="top">Thông tin xe:</td>
                                <td style="padding: 7px 0; font-size: 14px; color: #0f172a;">
                                  ${data.vehicleName || "Xe giường nằm"} ${data.licensePlate ? `(${data.licensePlate})` : ""}
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 10px 0 7px 0; font-size: 14px; color: #64748b; border-top: 1px dashed #f1f5f9;" valign="top">Điểm đón:</td>
                                <td style="padding: 10px 0 7px 0; font-size: 14px; color: #0f172a; border-top: 1px dashed #f1f5f9;">
                                  <strong style="color: #2563eb;">${data.pickupPointName || "Bến xe xuất phát"}</strong>
                                  ${data.pickupPointAddress ? `<br><span style="font-size: 13px; color: #64748b; display: inline-block; margin-top: 2px;">Địa chỉ: ${data.pickupPointAddress}</span>` : ""}
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 10px 0 7px 0; font-size: 14px; color: #64748b; border-top: 1px dashed #f1f5f9;" valign="top">Điểm trả:</td>
                                <td style="padding: 10px 0 7px 0; font-size: 14px; color: #0f172a; border-top: 1px dashed #f1f5f9;">
                                  <strong>${data.dropoffPointName || "Bến xe đích"}</strong>
                                  ${data.dropoffPointAddress ? `<br><span style="font-size: 13px; color: #64748b; display: inline-block; margin-top: 2px;">Địa chỉ: ${data.dropoffPointAddress}</span>` : ""}
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>

                      <!-- QR Code Section -->
                      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fdf2e9; border: 1px dashed #f97316; border-radius: 12px; padding: 20px; text-align: center;">
                        <tr>
                          <td>
                            <p style="margin: 0 0 10px 0; font-size: 14px; color: #c2410c; font-weight: 600;">
                              MÃ QR CHECK-IN LÊN XE
                            </p>
                            <div style="display: inline-block; background-color: #ffffff; padding: 12px; border-radius: 12px; border: 1px solid #fed7aa; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                              <img src="${qrCodeUrl}" width="160" height="160" alt="QR Code ${data.bookingCode}" style="display: block;" />
                            </div>
                            <p style="margin: 12px 0 0 0; font-size: 13px; color: #7c2d12; font-style: italic;">
                              * Vui lòng chuẩn bị sẵn mã QR này trên điện thoại hoặc đọc Mã đặt vé cho nhân viên/tài xế khi lên xe.
                            </p>
                          </td>
                        </tr>
                      </table>

                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8fafc; padding: 24px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                      <p style="margin: 0 0 6px 0; font-size: 14px; color: #475569; font-weight: 700;">Hệ thống Vé Xe Khách Điện Tử XeKhachPT</p>
                      <p style="margin: 0 0 12px 0; font-size: 12px; color: #94a3b8;">Hotline hỗ trợ 24/7: 1900 xxxx | Website: xekhachpt.com</p>
                      <p style="margin: 0; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 12px;">Đây là email tự động từ hệ thống. Vui lòng không phản hồi trực tiếp (no-reply) vào email này.</p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });
    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error("[SMTP PAYMENT EMAIL FAILED]", {
      to: data.to,
      error,
    });
    throw error;
  }
}
