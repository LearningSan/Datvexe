"use client";

import { useEffect, useRef, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useSearchParams, usePathname, useRouter } from "next/navigation";

import { useAuthStore } from "@/store/auth.store";

export default function ClientAuthBootstrap({
  children,
}: {
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);

  const handledAuth = useRef(false);

  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  // Refresh user khi mở trang
  useEffect(() => {
    axios
      .post(
        "/api/client/auth/refresh",
        {},
        {
          withCredentials: true,
        },
      )
      .then((res) => {
        const data = res.data.data;

        setAuth({
          accessToken: data.accessToken,
          user: data.user,
        });
      })
      .catch(() => {
        clearAuth();
      })
      .finally(() => {
        setReady(true);
      });
  }, [setAuth, clearAuth]);

  // Xử lý kết quả OAuth
  useEffect(() => {
    if (!ready || handledAuth.current) return;

    const auth = searchParams.get("auth");

    if (!auth) return;

    handledAuth.current = true;

    switch (auth) {
      case "blocked":
        toast.error(
          "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.",
        );
        break;

      case "oauth_failed":
        toast.error("Đăng nhập Google/Facebook thất bại.");
        break;

      case "success":
        toast.success("Đăng nhập thành công.");
        break;

      default:
        break;
    }

    // Xóa ?auth khỏi URL
    setTimeout(() => {
      router.replace(pathname);
    }, 100);
  }, [ready, searchParams, pathname, router]);

  // Chờ refresh auth xong mới render app
  if (!ready) {
    return null;
  }

  return children;
}
