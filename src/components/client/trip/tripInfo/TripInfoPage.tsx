"use client";

import { useState } from "react";
import styles from "./TripInfoPage.module.css";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bus,
  Clock,
  MapPin,
  ShieldCheck,
  Ticket,
  AlertCircle,
  PhoneCall,
  Map,
} from "lucide-react";

type InfoType = "schedule" | "shuttle" | "policy";

interface Props {
  tripId: string;
  type: InfoType;
}

export default function TripInfoPage({ tripId, type: initialType }: Props) {
  const router = useRouter();
  // Nâng cấp UX: Cho phép chuyển tab trực tiếp trên trang thay vì phải quay lại
  const [activeTab, setActiveTab] = useState<InfoType>(initialType);

  const tabs = [
    { id: "schedule", label: "Lịch trình chuyến xe" },
    { id: "shuttle", label: "Thông tin trung chuyển" },
    { id: "policy", label: "Chính sách & Quy định" },
  ] as const;

  return (
    <main className={styles.page}>
      {/* Nút quay lại tinh tế hơn */}
      <button className={styles.backBtn} onClick={() => router.back()}>
        <ArrowLeft size={16} />
        <span>Quay lại danh sách chuyến</span>
      </button>

      {/* Hero Section hiện đại, sang trọng */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <span className={styles.badge}>Mã chuyến #{tripId}</span>
          <h1>{tabs.find((t) => t.id === activeTab)?.label}</h1>
          <p className={styles.desc}>
            Thông tin chi tiết giúp bạn nắm rõ lộ trình di chuyển, quy định
            trung chuyển và các chính sách hoàn đổi vé trước khi khởi hành.
          </p>
        </div>

        <div className={styles.heroIcon}>
          <Bus size={36} strokeWidth={1.5} />
        </div>
      </section>

      {/* Tích hợp Thanh chuyển Tab chuyên nghiệp */}
      <div className={styles.tabContainer}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tabBtn} ${activeTab === tab.id ? styles.tabActive : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Render nội dung tương ứng theo Tab */}
      <div className={styles.contentWrapper}>
        {activeTab === "schedule" && <ScheduleContent />}
        {activeTab === "shuttle" && <ShuttleContent />}
        {activeTab === "policy" && <PolicyContent />}
      </div>
    </main>
  );
}

function ScheduleContent() {
  return (
    <section className={styles.grid}>
      <div className={styles.card}>
        <h2>
          <MapPin size={20} className={styles.iconPrimary} />
          Chi tiết tuyến đường di chuyển
        </h2>

        {/* Nâng cấp Timeline có đường kẻ dọc nối liền chuyên nghiệp */}
        <div className={styles.timeline}>
          <div className={styles.stop}>
            <div className={styles.timelineIndicator}>
              <span className={`${styles.dot} ${styles.dotStart}`}></span>
              <span className={styles.line}></span>
            </div>
            <div className={styles.stopContent}>
              <h3>Điểm xuất phát</h3>
              <p>Bến xe / văn phòng chính theo tuyến đã chọn.</p>
            </div>
          </div>

          <div className={styles.stop}>
            <div className={styles.timelineIndicator}>
              <span className={`${styles.dot} ${styles.dotMiddle}`}></span>
              <span className={styles.line}></span>
            </div>
            <div className={styles.stopContent}>
              <h3>Điểm dừng trung gian</h3>
              <p>
                Xe dừng nghỉ ngơi tại trạm dừng chân quy định hoặc hỗ trợ đón
                trả khách dọc đường.
              </p>
            </div>
          </div>

          <div className={styles.stop}>
            <div className={styles.timelineIndicator}>
              <span className={`${styles.dot} ${styles.dotEnd}`}></span>
            </div>
            <div className={styles.stopContent}>
              <h3>Điểm trả khách cuối</h3>
              <p>
                Trả khách an toàn tại bến xe đích, văn phòng trung tâm hoặc các
                điểm hẹn trước.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <h2>
          <Clock size={20} className={styles.iconOrange} />
          Lưu ý quan trọng về thời gian
        </h2>

        <div className={styles.infoList}>
          <div className={styles.infoItem}>
            <AlertCircle size={16} />
            <p>
              Khách hàng vui lòng có mặt tại điểm đón ít nhất{" "}
              <strong>30 phút</strong> trước giờ khởi hành hành trình.
            </p>
          </div>
          <div className={styles.infoItem}>
            <Clock size={16} />
            <p>
              Thời gian dự kiến có thể chênh lệch tùy thuộc vào tình hình giao
              thông thực tế hoặc thời tiết.
            </p>
          </div>
          <div className={styles.infoItem}>
            <PhoneCall size={16} />
            <p>
              Nhân viên tổng đài hoặc tài xế sẽ liên hệ xác nhận trước khi xe
              xuất bến.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ShuttleContent() {
  return (
    <section className={styles.grid}>
      <div className={styles.card}>
        <h2>
          <Bus size={20} className={styles.iconPrimary} />
          Phạm vi & Khu vực trung chuyển
        </h2>

        <div className={styles.infoList}>
          <div className={styles.infoItem}>
            <Map size={16} />
            <p>
              Hỗ trợ xe trung chuyển đón/trả tận nơi miễn phí tại một số quận
              nội thành bán kính quy định.
            </p>
          </div>
          <div className={styles.infoItem}>
            <AlertCircle size={16} />
            <p>
              Vui lòng cung cấp chính xác và chi tiết{" "}
              <strong>địa chỉ số nhà, tên đường</strong> khi tiến hành đặt vé.
            </p>
          </div>
          <div className={styles.infoItem}>
            <PhoneCall size={16} />
            <p>
              Tài xế xe trung chuyển sẽ liên hệ trước để hẹn giờ đón chính xác
              dựa trên lộ trình di chuyển.
            </p>
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <h2>
          <MapPin size={20} className={styles.iconOrange} />
          Quy định giới hạn địa chỉ
        </h2>

        <div className={styles.infoList}>
          <div className={styles.infoItem}>
            <AlertCircle size={16} />
            <p>
              Hệ thống có quyền từ chối đón/trả đối với các địa chỉ nằm ngoài
              phạm vi hoặc quá xa tuyến đường.
            </p>
          </div>
          <div className={styles.infoItem}>
            <AlertCircle size={16} />
            <p>
              Không hỗ trợ đón tận cửa đối với hẻm quá nhỏ, đường cấm xe ô tô
              hoặc khu vực giao thông ùn tắc.
            </p>
          </div>
          <div className={styles.infoItem}>
            <PhoneCall size={16} />
            <p>
              Khách hàng vui lòng giữ liên lạc liên tục qua số điện thoại đã
              đăng ký trước giờ hẹn đón.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function PolicyContent() {
  return (
    <section className={styles.grid}>
      <div className={styles.card}>
        <h2>
          <Ticket size={20} className={styles.iconPrimary} />
          Chính sách sử dụng vé
        </h2>

        <div className={styles.infoList}>
          <div className={styles.infoItem}>
            <ShieldCheck size={16} />
            <p>
              Vé xe chỉ có giá trị sử dụng cho đúng thông tin hành trình, ngày
              giờ và số ghế đã xác nhận.
            </p>
          </div>
          <div className={styles.infoItem}>
            <AlertCircle size={16} />
            <p>
              Thông tin số điện thoại người đi phải chính xác để nhận mã vé điện
              tử và liên lạc khi cần thiết.
            </p>
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <h2>
          <ShieldCheck size={20} className={styles.iconOrange} />
          Quy định hủy & Đổi trả vé
        </h2>

        <div className={styles.infoList}>
          <div className={styles.infoItem}>
            <AlertCircle size={16} />
            <p>
              Yêu cầu hủy hoặc đổi lịch vé phải thực hiện trước giờ khởi hành
              tối thiểu <strong>24 tiếng</strong>.
            </p>
          </div>
          <div className={styles.infoItem}>
            <AlertCircle size={16} />
            <p>
              Vé hủy sát giờ hoặc sau khi xe đã xuất bến sẽ không được hoàn trả
              chi phí dưới mọi hình thức.
            </p>
          </div>
          <div className={styles.infoItem}>
            <ShieldCheck size={16} />
            <p>
              Trong trường hợp bất khả kháng do nhà xe hủy chuyến, hệ thống sẽ
              hoàn trả 100% tiền vé cho bạn.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
