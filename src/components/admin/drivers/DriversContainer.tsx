"use client";

import { useState } from "react";
import toast, { Toaster } from "react-hot-toast";

import {
  useCreateDriver,
  useDrivers,
  useUpdateDriver,
  useUpdateDriverStatus,
} from "@/hooks/admin/useDrivers";

import DriverDetailModal from "./DriverDetailModal";
import DriverFormModal from "./DriverFormModal";

import type { AdminDriverItem } from "@/types/admin/drivers/driver-management.type";

import BlockErrorBoundary from "@/components/common/BlockErrorBoundary";
import BlockSkeleton from "@/components/common/BlockSkeleton";

import styles from "./DriversContainer.module.css";

export default function DriversContainer() {
  const [keyword, setKeyword] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");

  const [driverType, setDriverType] = useState<"" | "BUS" | "SHUTTLE" | "BOTH">(
    "",
  );

  const [status, setStatus] = useState<"" | "AVAILABLE" | "ASSIGNED" | "OFF">(
    "",
  );

  const [warningFilter, setWarningFilter] = useState<
    "" | "EXPIRED_LICENSE" | "NO_ASSIGNED_VEHICLE" | "INACTIVE"
  >("");

  const [page, setPage] = useState(1);

  const [openForm, setOpenForm] = useState(false);
  const [formMode, setFormMode] = useState<"CREATE" | "EDIT">("CREATE");
  const [selectedDriver, setSelectedDriver] = useState<AdminDriverItem | null>(
    null,
  );

  const [openDetail, setOpenDetail] = useState(false);
  const [detailDriver, setDetailDriver] = useState<AdminDriverItem | null>(
    null,
  );

  const createMutation = useCreateDriver();
  const updateMutation = useUpdateDriver();
  const statusMutation = useUpdateDriverStatus();

  const { data, isLoading, isError } = useDrivers({
    keyword: searchKeyword,
    driverType: driverType || undefined,
    status: status || undefined,
    warning: warningFilter || undefined,
    page,
    limit: 10,
  });

  const driverItems = data?.items ?? [];
  const totalPages = Math.ceil((data?.total ?? 0) / 10) || 1;

  const totalDrivers = data?.total ?? 0;

  const availableCount = driverItems.filter(
    (driver) => driver.status === "AVAILABLE",
  ).length;

  const assignedCount = driverItems.filter(
    (driver) => driver.status === "ASSIGNED",
  ).length;

  const offCount = driverItems.filter(
    (driver) => driver.status === "OFF",
  ).length;

  const busCount = driverItems.filter(
    (driver) => driver.driverType === "BUS",
  ).length;

  const handleSearch = () => {
    setPage(1);
    setSearchKeyword(keyword.trim());
  };

  const handleClearSearch = () => {
    setKeyword("");
    setSearchKeyword("");
    setDriverType("");
    setStatus("");
    setWarningFilter("");
    setPage(1);
    toast.success("Đã xóa toàn bộ bộ lọc tìm kiếm");
  };

  const getDriverTypeLabel = (type: string) => {
    if (type === "BUS") return "🚌 Xe khách";
    if (type === "SHUTTLE") return "🚐 Trung chuyển";
    return "🔄 Cả hai loại";
  };

  const getStatusLabel = (value: string) => {
    if (value === "AVAILABLE") return "● Sẵn sàng";
    if (value === "ASSIGNED") return "● Đang chạy chuyến";
    return "● Đang nghỉ";
  };

  const handleToggleDriverStatus = (driver: AdminDriverItem) => {
    if (driver.status === "ASSIGNED") {
      toast.error("Không thể tạm ngưng tài xế đang được phân công chuyến.");
      return;
    }

    const nextStatus = driver.status === "OFF" ? "AVAILABLE" : "OFF";

    statusMutation.mutate(
      {
        driverId: driver.driverId,
        status: nextStatus,
      },
      {
        onSuccess: () => {
          toast.success(
            nextStatus === "OFF"
              ? `Đã tạm ngưng tài xế: ${driver.fullName}`
              : `Đã kích hoạt lại tài xế: ${driver.fullName}`,
          );
        },
        onError: (error: any) => {
          toast.error(error?.message || "Cập nhật trạng thái thất bại.");
        },
      },
    );
  };

  if (isLoading) return <BlockSkeleton height={500} />;

  if (isError) {
    return <div className={styles.empty}>Không thể tải danh sách tài xế.</div>;
  }

  return (
    <BlockErrorBoundary fallback={<BlockSkeleton height={500} />}>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            fontSize: "14px",
            fontWeight: 600,
            borderRadius: "6px",
            background: "#1e293b",
            color: "#fff",
          },
        }}
      />

      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1>Quản lý tài xế</h1>
            <p>
              Quản lý hồ sơ tài xế, giấy phép lái xe, trạng thái làm việc và
              lịch sử phân công chuyến.
            </p>
          </div>

          <button
            className={styles.primaryBtn}
            onClick={() => {
              setFormMode("CREATE");
              setSelectedDriver(null);
              setOpenForm(true);
            }}
          >
            <span className={styles.icon}>+</span> Đăng ký tài xế mới
          </button>
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span>Tổng tài xế</span>
            <strong>{totalDrivers}</strong>
          </div>

          <div className={styles.statCard}>
            <span>Sẵn sàng</span>
            <strong>{availableCount}</strong>
          </div>

          <div className={styles.statCard}>
            <span>Đang chạy</span>
            <strong>{assignedCount}</strong>
          </div>

          <div className={styles.statCard}>
            <span>Tạm nghỉ</span>
            <strong>{offCount}</strong>
          </div>

          <div className={styles.statCard}>
            <span>Tài xế xe khách</span>
            <strong>{busCount}</strong>
          </div>
        </div>

        <div className={styles.filters}>
          <div className={styles.searchWrapper}>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              placeholder="Tìm theo tên, số điện thoại hoặc số bằng lái..."
            />

            <button
              type="button"
              className={styles.searchBtn}
              onClick={handleSearch}
            >
              Tìm kiếm
            </button>

            {(keyword || driverType || status || warningFilter) && (
              <button
                type="button"
                className={styles.clearBtn}
                onClick={handleClearSearch}
              >
                Xóa lọc
              </button>
            )}
          </div>

          <select
            value={driverType}
            onChange={(e) => {
              setPage(1);
              setDriverType(e.target.value as "" | "BUS" | "SHUTTLE" | "BOTH");
            }}
          >
            <option value="">Tất cả loại tài xế</option>
            <option value="BUS">Tài xế xe khách</option>
            <option value="SHUTTLE">Tài xế trung chuyển</option>
            <option value="BOTH">Tài xế đa năng</option>
          </select>

          <select
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(
                e.target.value as "" | "AVAILABLE" | "ASSIGNED" | "OFF",
              );
            }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="AVAILABLE">🟢 Sẵn sàng</option>
            <option value="ASSIGNED">🔵 Đang làm nhiệm vụ</option>
            <option value="OFF">⚪ Tạm nghỉ</option>
          </select>

          <select
            value={warningFilter}
            onChange={(e) => {
              setPage(1);
              setWarningFilter(e.target.value as any);
            }}
            className={warningFilter ? styles.selectWarningActive : ""}
          >
            <option value="">Không lọc cảnh báo</option>
            <option value="EXPIRED_LICENSE">GPLX quá hạn / sắp hết hạn</option>
            <option value="NO_ASSIGNED_VEHICLE">
              Chưa gán phương tiện điều phối
            </option>
            <option value="INACTIVE">Hồ sơ đang bị đình chỉ</option>
          </select>
        </div>

        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Thông tin tài xế</th>
                <th>Liên hệ</th>
                <th>Loại tài xế</th>
                <th>Giấy phép lái xe</th>
                <th>Trạng thái</th>
                <th>Tổng số chuyến</th>
                <th>Hành động</th>
              </tr>
            </thead>

            <tbody>
              {driverItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.empty}>
                    Không có tài xế nào khớp dữ liệu tìm kiếm hoặc bộ lọc.
                  </td>
                </tr>
              ) : (
                driverItems.map((driver) => (
                  <tr key={driver.driverId}>
                    <td>
                      <div className={styles.driverMeta}>
                        <div className={styles.driverAvatar}>🪪</div>

                        <div>
                          <strong>{driver.fullName}</strong>
                          <small className={styles.driverTagId}>
                            ID: #{driver.driverId}
                          </small>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className={styles.contactCell}>
                        <span>{driver.email ?? "Không có email"}</span>
                        <small>{driver.phone ?? "Không có SĐT"}</small>
                      </div>
                    </td>

                    <td>
                      <span className={styles.driverTypeBadge}>
                        {getDriverTypeLabel(driver.driverType)}
                      </span>
                    </td>

                    <td>
                      <span className={styles.licenseBadge}>
                        GPLX: <code>{driver.licenseNumber}</code>
                      </span>
                    </td>

                    <td>
                      <span
                        className={`${styles.statusBadge} ${
                          styles[driver.status.toLowerCase()]
                        }`}
                      >
                        {getStatusLabel(driver.status)}
                      </span>
                    </td>

                    <td>
                      <div className={styles.tripCounter}>
                        <strong>{driver.assignedTripCount}</strong>
                      </div>
                    </td>

                    <td>
                      <div className={styles.actionGroup}>
                        <button
                          className={styles.detailBtn}
                          onClick={() => {
                            setDetailDriver(driver);
                            setOpenDetail(true);
                          }}
                        >
                          Chi tiết
                        </button>

                        <button
                          className={styles.editBtn}
                          onClick={() => {
                            setFormMode("EDIT");
                            setSelectedDriver(driver);
                            setOpenForm(true);
                          }}
                        >
                          Cập nhật
                        </button>

                        <button
                          className={
                            driver.status === "OFF"
                              ? styles.unlockBtn
                              : styles.lockBtn
                          }
                          onClick={() => handleToggleDriverStatus(driver)}
                          disabled={statusMutation.isPending}
                        >
                          {driver.status === "OFF" ? "Kích hoạt" : "Tạm ngưng"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.pagination}>
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            ‹ Trang trước
          </button>

          <span>
            Trang <strong>{data?.page ?? page}</strong> / {totalPages}
          </span>

          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Trang sau ›
          </button>
        </div>

        <DriverFormModal
          open={openForm}
          mode={formMode}
          driver={selectedDriver}
          loading={createMutation.isPending || updateMutation.isPending}
          onClose={() => setOpenForm(false)}
          onSubmit={(payload) => {
            if (formMode === "CREATE") {
              createMutation.mutate(payload, {
                onSuccess: () => {
                  setOpenForm(false);
                  toast.success("Tạo mới hồ sơ tài xế thành công!");
                },
                onError: (error: any) => {
                  toast.error(error?.message || "Không thể tạo tài xế.");
                },
              });

              return;
            }

            if (!selectedDriver?.driverId) return;

            updateMutation.mutate(
              {
                driverId: selectedDriver.driverId,
                payload,
              },
              {
                onSuccess: () => {
                  setOpenForm(false);
                  toast.success("Đã cập nhật thông tin tài xế.");
                },
                onError: (error: any) => {
                  toast.error(error?.message || "Không thể cập nhật tài xế.");
                },
              },
            );
          }}
        />

        <DriverDetailModal
          open={openDetail}
          driver={detailDriver}
          onClose={() => setOpenDetail(false)}
        />
      </div>
    </BlockErrorBoundary>
  );
}
