import {
  LayoutDashboard,
  Users,
  UserCog,
  Bus,
  CalendarClock,
  Ticket,
  CreditCard,
  Star,
  Route,
  MapPin,
  CarFront,
  Armchair,
} from "lucide-react";

export const ADMIN_MENU = [
  {
    href: "/admin/dashboard",
    label: "Dashboard Tổng Quan",
    icon: LayoutDashboard,
  },
  {
    href: "/admin/users",
    label: "Quản lý Người dùng",
    icon: Users,
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
    href: "/admin/vehicles",
    label: "Quản lý Xe",
    icon: CarFront,
  },
  {
    href: "/admin/seat-layouts",
    label: "Quản lý Sơ đồ ghế",
    icon: Armchair,
  },
  // ==========================
  // VẬN HÀNH
  // ==========================
  {
    href: "/admin/schedule-templates",
    label: "Quản lý Lịch chạy",
    icon: CalendarClock,
  },
  {
    href: "/admin/trips",
    label: "Quản lý Chuyến xe",
    icon: Bus,
  },

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
    href: "/admin/reviews",
    label: "Đánh giá khách hàng",
    icon: Star,
  },
];
