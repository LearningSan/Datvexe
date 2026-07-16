"use client";

import { FormEvent, useState } from "react";

import {
  Building2,
  Clock3,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
} from "lucide-react";

import { useSendContactRequest } from "@/hooks/client/useContact";

import type {
  ContactFormPayload,
  ContactSubject,
} from "@/types/client/contact/contact.type";

import styles from "./ContactContainer.module.css";

const OFFICES = [
  {
    id: 1,
    name: "Văn phòng Hồ Chí Minh",
    address: "395 Kinh Dương Vương, Quận Bình Tân, TP. Hồ Chí Minh",
    phone: "1900 1234",
    workingTime: "05:00 - 23:00",
    mapUrl:
      "https://www.google.com/maps/search/?api=1&query=395+Kinh+Dương+Vương+Hồ+Chí+Minh",
  },
  {
    id: 2,
    name: "Văn phòng Đà Lạt",
    address: "01 Tô Hiến Thành, Phường 3, TP. Đà Lạt",
    phone: "1900 1234",
    workingTime: "05:00 - 22:00",
    mapUrl:
      "https://www.google.com/maps/search/?api=1&query=01+Tô+Hiến+Thành+Đà+Lạt",
  },
  {
    id: 3,
    name: "Văn phòng Nha Trang",
    address: "10 Đường 23/10, TP. Nha Trang, Khánh Hòa",
    phone: "1900 1234",
    workingTime: "05:30 - 22:30",
    mapUrl:
      "https://www.google.com/maps/search/?api=1&query=Nha+Trang+Khánh+Hòa",
  },
];

const SUBJECT_OPTIONS: Array<{
  value: ContactSubject;
  label: string;
}> = [
  {
    value: "SERVICE_FEEDBACK",
    label: "Góp ý dịch vụ",
  },
  {
    value: "LOST_LUGGAGE",
    label: "Thất lạc hành lý",
  },
  {
    value: "COMPLAINT",
    label: "Khiếu nại",
  },
  {
    value: "BOOKING_SUPPORT",
    label: "Hỗ trợ đặt vé",
  },
  {
    value: "BUSINESS_PARTNERSHIP",
    label: "Hợp tác kinh doanh",
  },
  {
    value: "OTHER",
    label: "Nội dung khác",
  },
];

const INITIAL_FORM: ContactFormPayload = {
  fullName: "",
  email: "",
  phone: "",
  subject: "SERVICE_FEEDBACK",
  message: "",
};

export default function ContactContainer() {
  const [form, setForm] = useState<ContactFormPayload>(INITIAL_FORM);

  const [successMessage, setSuccessMessage] = useState("");

  const { mutateAsync, isPending, error } = useSendContactRequest();

  const updateField = <K extends keyof ContactFormPayload>(
    field: K,
    value: ContactFormPayload[K],
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setSuccessMessage("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setSuccessMessage("");

    try {
      await mutateAsync(form);

      setSuccessMessage(
        "Phản hồi của bạn đã được gửi thành công. Chúng tôi sẽ liên hệ lại sớm nhất.",
      );

      setForm(INITIAL_FORM);
    } catch {
      // Lỗi được lấy từ mutation.
    }
  };

  const errorMessage =
    (error as any)?.response?.data?.message ||
    (error as Error | null)?.message ||
    "";

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <span className={styles.eyebrow}>Hỗ trợ khách hàng</span>

          <h1>Chúng tôi luôn sẵn sàng hỗ trợ bạn</h1>

          <p>
            Liên hệ ngay khi cần hỗ trợ đặt vé, thất lạc hành lý, gửi hàng hoặc
            phản hồi về chất lượng dịch vụ.
          </p>
        </div>
      </section>

      <section className={styles.content}>
        <div className={styles.emergencyGrid}>
          <a href="tel:19001234" className={styles.emergencyCard}>
            <div className={styles.emergencyIcon}>
              <Phone size={25} />
            </div>

            <div>
              <span>Hotline chăm sóc khách hàng 24/7</span>
              <strong>1900 1234</strong>
              <small>Bấm để gọi ngay</small>
            </div>
          </a>

          <a href="tel:0909123456" className={styles.emergencyCard}>
            <div className={styles.emergencyIcon}>
              <Building2 size={25} />
            </div>

            <div>
              <span>Gửi hàng và ký gửi</span>
              <strong>0909 123 456</strong>
              <small>Hỗ trợ tiếp nhận hàng hóa</small>
            </div>
          </a>

          <a
            href="mailto:support@xekhachpt.vn"
            className={styles.emergencyCard}
          >
            <div className={styles.emergencyIcon}>
              <Mail size={25} />
            </div>

            <div>
              <span>Email hỗ trợ</span>
              <strong>support@xekhachpt.vn</strong>
              <small>Phản hồi trong giờ làm việc</small>
            </div>
          </a>
        </div>

        <div className={styles.mainGrid}>
          <div className={styles.formCard}>
            <div className={styles.sectionHeading}>
              <span>Gửi phản hồi</span>
              <h2>Chúng tôi có thể giúp gì cho bạn?</h2>
            </div>

            <form onSubmit={handleSubmit}>
              <div className={styles.formGrid}>
                <label>
                  <span>Họ và tên</span>

                  <input
                    required
                    value={form.fullName}
                    placeholder="Nhập họ và tên"
                    onChange={(event) =>
                      updateField("fullName", event.target.value)
                    }
                  />
                </label>

                <label>
                  <span>Số điện thoại</span>

                  <input
                    required
                    value={form.phone}
                    placeholder="Nhập số điện thoại"
                    onChange={(event) =>
                      updateField("phone", event.target.value)
                    }
                  />
                </label>

                <label>
                  <span>Email</span>

                  <input
                    required
                    type="email"
                    value={form.email}
                    placeholder="Nhập địa chỉ email"
                    onChange={(event) =>
                      updateField("email", event.target.value)
                    }
                  />
                </label>

                <label>
                  <span>Chủ đề</span>

                  <select
                    value={form.subject}
                    onChange={(event) =>
                      updateField(
                        "subject",
                        event.target.value as ContactSubject,
                      )
                    }
                  >
                    {SUBJECT_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className={styles.messageField}>
                <span>Nội dung lời nhắn</span>

                <textarea
                  required
                  rows={7}
                  value={form.message}
                  placeholder="Mô tả chi tiết vấn đề bạn đang gặp phải..."
                  onChange={(event) =>
                    updateField("message", event.target.value)
                  }
                />
              </label>

              {successMessage && (
                <div className={styles.successMessage}>{successMessage}</div>
              )}

              {errorMessage && (
                <div className={styles.errorMessage}>{errorMessage}</div>
              )}

              <button
                type="submit"
                className={styles.submitButton}
                disabled={isPending}
              >
                <Send size={18} />

                {isPending ? "Đang gửi phản hồi..." : "Gửi phản hồi"}
              </button>
            </form>
          </div>

          <aside className={styles.contactSide}>
            <div className={styles.sideCard}>
              <h3>Kết nối nhanh</h3>

              <a href="https://facebook.com" target="_blank" rel="noreferrer">
                <MessageCircle size={20} />
                Fanpage Facebook
              </a>

              <a href="https://zalo.me" target="_blank" rel="noreferrer">
                <MessageCircle size={20} />
                Zalo Official Account
              </a>

              <a href="mailto:support@xekhachpt.vn">
                <Mail size={20} />
                Email hỗ trợ
              </a>
            </div>

            <div className={styles.sideCard}>
              <h3>Thời gian làm việc</h3>

              <div className={styles.workingRow}>
                <Clock3 size={20} />

                <div>
                  <strong>Tổng đài hỗ trợ</strong>
                  <span>24 giờ mỗi ngày</span>
                </div>
              </div>

              <div className={styles.workingRow}>
                <Clock3 size={20} />

                <div>
                  <strong>Văn phòng</strong>
                  <span>05:00 - 23:00</span>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <div className={styles.officeSection}>
          <div className={styles.officeHeading}>
            <span>Hệ thống văn phòng</span>
            <h2>Văn phòng và bến xe</h2>
          </div>

          <div className={styles.officeGrid}>
            {OFFICES.map((office) => (
              <article key={office.id} className={styles.officeCard}>
                <div className={styles.officeIcon}>
                  <Building2 size={24} />
                </div>

                <h3>{office.name}</h3>

                <div className={styles.officeInfo}>
                  <p>
                    <MapPin size={18} />
                    {office.address}
                  </p>

                  <p>
                    <Phone size={18} />
                    {office.phone}
                  </p>

                  <p>
                    <Clock3 size={18} />
                    {office.workingTime}
                  </p>
                </div>

                <a
                  href={office.mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.mapButton}
                >
                  <MapPin size={17} />
                  Xem chỉ đường
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
