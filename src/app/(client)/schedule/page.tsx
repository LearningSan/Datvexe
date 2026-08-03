import type { Metadata } from "next";

import ScheduleContainer from "@/components/home/schedule/ScheduleContainer";

export const metadata: Metadata = {
  title: "Lịch trình xe | XeKhachPT",
  description:
    "Tra cứu lịch trình, giá vé, loại xe và tần suất chạy của các tuyến xe.",
};

export default function SchedulePage() {
  return <ScheduleContainer />;
}