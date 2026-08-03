import {
  LayoutDashboard,
  QrCode,
  ScanLine,
  UserCheck,
  Ticket,
  CreditCard,
  Wallet,
  Bus,
  CalendarClock,
  CarFront,
  UserCog,
  Route,
  MapPin,
  Armchair,
  Users,
  Star,
} from "lucide-react";

export const ADMIN_MENU = [
  // ==========================
  // TỔNG QUAN
  // ==========================
  {
    href: "/admin/dashboard",
    label: "Dashboard Tổng Quan",
    icon: LayoutDashboard,
  },

  // ==========================
  // NGHIỆP VỤ HẰNG NGÀY
  // ==========================
  {
    href: "/admin/cash-payments",
    label: "Thanh toán tại quầy",
    icon: QrCode,
  },
  {
    href: "/admin/checkins",
    label: "Check-in hành khách",
    icon: ScanLine,
  },
  {
    href: "/admin/checkins/dashboard",
    label: "Dashboard Check-in",
    icon: UserCheck,
  },

  // ==========================
  // ĐẶT VÉ & THANH TOÁN
  // ==========================
  {
    href: "/admin/tickets",
    label: "Quản lý Vé xe",
    icon: Ticket,
  },
  {
    href: "/admin/payments",
    label: "Lịch sử Thanh toán",
    icon: CreditCard,
  },
  {
    href: "/admin/wallets",
    label: "Quản lý Ví nội bộ",
    icon: Wallet,
  },

  // ==========================
  // VẬN HÀNH
  // ==========================
  {
    href: "/admin/trips",
    label: "Quản lý Chuyến xe",
    icon: Bus,
  },
  {
    href: "/admin/schedule-templates",
    label: "Quản lý Lịch chạy",
    icon: CalendarClock,
  },

  // ==========================
  // DỮ LIỆU HỆ THỐNG
  // ==========================
  {
    href: "/admin/vehicles",
    label: "Quản lý Xe",
    icon: CarFront,
  },
  {
    href: "/admin/drivers",
    label: "Quản lý Tài xế",
    icon: UserCog,
  },
  {
    href: "/admin/routes",
    label: "Quản lý Tuyến xe",
    icon: Route,
  },
  {
    href: "/admin/pickup-points",
    label: "Quản lý Điểm đón trả",
    icon: MapPin,
  },
  {
    href: "/admin/seat-layouts",
    label: "Quản lý Sơ đồ ghế",
    icon: Armchair,
  },

  // ==========================
  // KHÁCH HÀNG
  // ==========================
  {
    href: "/admin/users",
    label: "Quản lý Người dùng",
    icon: Users,
  },
  {
    href: "/admin/reviews",
    label: "Đánh giá khách hàng",
    icon: Star,
  },
];
