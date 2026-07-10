"use client";

import { useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
  useCreateVehicle,
  useUpdateVehicle,
  useUpdateVehicleStatus,
  useVehicleOptions,
  useVehicles,
} from "@/hooks/admin/useVehicles";
import type {
  AdminVehicleItem,
  VehicleStatus,
} from "@/types/admin/vehicles/vehicle-management.type";
import VehicleFormModal from "./VehicleFormModal";
import styles from "./VehiclesContainer.module.css";

const LIMIT = 10;

function getStatusLabel(status: VehicleStatus) {
  const map: Record<VehicleStatus, string> = {
    AVAILABLE: "Khả dụng",
    ASSIGNED: "Đã xếp chuyến",
    MAINTENANCE: "Bảo trì",
    INACTIVE: "Ngưng sử dụng",
  };

  return map[status] || status;
}

export default function VehiclesContainer() {
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<"" | VehicleStatus>("");
  const [vehicleTypeId, setVehicleTypeId] = useState("");
  const [page, setPage] = useState(1);

  const [appliedFilters, setAppliedFilters] = useState({
    keyword: "",
    status: "" as "" | VehicleStatus,
    vehicleTypeId: "",
  });

  const [openForm, setOpenForm] = useState(false);
  const [formMode, setFormMode] = useState<"CREATE" | "EDIT">("CREATE");
  const [selectedVehicle, setSelectedVehicle] =
    useState<AdminVehicleItem | null>(null);

  // Trạng thái quản lý đóng/mở Modal xác nhận ngưng dùng xe
  const [vehicleToInactive, setVehicleToInactive] =
    useState<AdminVehicleItem | null>(null);

  const { data: options } = useVehicleOptions();

  const { data, isLoading, isError } = useVehicles({
    keyword: appliedFilters.keyword,
    status: appliedFilters.status || undefined,
    vehicleTypeId: appliedFilters.vehicleTypeId
      ? Number(appliedFilters.vehicleTypeId)
      : undefined,
    page,
    limit: LIMIT,
  });

  const createMutation = useCreateVehicle();
  const updateMutation = useUpdateVehicle();
  const statusMutation = useUpdateVehicleStatus();

  const totalPage = useMemo(() => {
    return Math.ceil((data?.total ?? 0) / LIMIT) || 1;
  }, [data?.total]);

  const handleApplyFilter = () => {
    setPage(1);
    setAppliedFilters({
      keyword: keyword.trim(),
      status,
      vehicleTypeId,
    });
  };

  const handleClearFilter = () => {
    setKeyword("");
    setStatus("");
    setVehicleTypeId("");
    setPage(1);
    setAppliedFilters({
      keyword: "",
      status: "",
      vehicleTypeId: "",
    });
  };

  // Hàm thực thi ngưng sử dụng từ Modal xác nhận
  const handleConfirmInactive = () => {
    if (!vehicleToInactive) return;

    statusMutation.mutate(
      {
        vehicleId: vehicleToInactive.vehicleId,
        payload: { status: "INACTIVE" },
      },
      {
        onSuccess: () => {
          toast.success(
            `Đã chuyển xe ${vehicleToInactive.licensePlate} sang ngưng sử dụng`,
          );
          setVehicleToInactive(null);
        },
        onError: (error: any) => toast.error(error.message),
      },
    );
  };

  if (isLoading) return <div className={styles.loading}>Đang tải xe...</div>;

  if (isError) {
    return (
      <div className={styles.error}>
        Không thể tải danh sách xe. Vui lòng thử lại.
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Toaster position="top-right" />

      <div className={styles.header}>
        <div>
          <h1>Quản lý xe</h1>
          <p>Quản lý xe thật đang vận hành, dùng để điều phối chuyến.</p>
        </div>

        <button
          className={styles.primaryBtn}
          onClick={() => {
            setFormMode("CREATE");
            setSelectedVehicle(null);
            setOpenForm(true);
          }}
        >
          + Thêm xe
        </button>
      </div>

      <div className={styles.filterBar}>
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleApplyFilter()}
          placeholder="Tìm mã xe, biển số, tên xe, loại xe..."
        />

        <select
          value={vehicleTypeId}
          onChange={(e) => setVehicleTypeId(e.target.value)}
        >
          <option value="">Tất cả loại xe</option>
          {options?.vehicleTypes.map((item) => (
            <option key={item.vehicleTypeId} value={item.vehicleTypeId}>
              {item.vehicleTypeName} - {item.totalSeats} ghế
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as "" | VehicleStatus)}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="AVAILABLE">Khả dụng</option>
          <option value="ASSIGNED">Đã xếp chuyến</option>
          <option value="MAINTENANCE">Bảo trì</option>
          <option value="INACTIVE">Ngưng sử dụng</option>
        </select>

        <button onClick={handleApplyFilter}>Tìm kiếm</button>
        <button onClick={handleClearFilter} className={styles.secondaryBtn}>
          Xóa lọc
        </button>
      </div>

      <div className={styles.tableCard}>
        <table>
          <thead>
            <tr>
              <th>Mã xe</th>
              <th>Biển số</th>
              <th>Tên xe</th>
              <th>Loại xe</th>
              <th>Số ghế</th>
              <th>Trạng thái</th>
              <th>Chuyến sắp tới</th>
              <th>Thao tác</th>
            </tr>
          </thead>

          <tbody>
            {data?.items.map((vehicle) => (
              <tr key={vehicle.vehicleId}>
                <td>{vehicle.internalCode || "Chưa có"}</td>
                <td>
                  <strong>{vehicle.licensePlate}</strong>
                </td>
                <td>{vehicle.vehicleName || "Không đặt tên"}</td>
                <td>
                  <div>{vehicle.vehicleTypeName}</div>
                  <small>{vehicle.layoutName}</small>
                </td>
                <td>{vehicle.totalSeats}</td>
                <td>
                  <span
                    className={`${styles.status} ${
                      styles[vehicle.status.toLowerCase()]
                    }`}
                  >
                    {getStatusLabel(vehicle.status)}
                  </span>
                </td>
                <td>{vehicle.upcomingTrip || "Chưa có"}</td>
                <td>
                  <div className={styles.actions}>
                    <button
                      className={styles.editBtn}
                      onClick={() => {
                        setFormMode("EDIT");
                        setSelectedVehicle(vehicle);
                        setOpenForm(true);
                      }}
                    >
                      Sửa
                    </button>

                    <button
                      className={
                        vehicle.status === "INACTIVE"
                          ? styles.activateBtn
                          : styles.inactiveBtn
                      }
                      onClick={() => {
                        if (vehicle.status === "INACTIVE") {
                          statusMutation.mutate(
                            {
                              vehicleId: vehicle.vehicleId,
                              payload: { status: "AVAILABLE" },
                            },
                            {
                              onSuccess: () =>
                                toast.success("Đã kích hoạt lại xe"),
                              onError: (error: any) =>
                                toast.error(error.message),
                            },
                          );
                          return;
                        }

                        setVehicleToInactive(vehicle);
                      }}
                    >
                      {vehicle.status === "INACTIVE"
                        ? "Kích hoạt lại"
                        : "Ngưng dùng"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {data?.items.length === 0 && (
              <tr>
                <td colSpan={8} className={styles.empty}>
                  Không có xe nào khớp bộ lọc.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.pagination}>
        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Trang trước
        </button>

        <span>
          Trang {page} / {totalPage}
        </span>

        <button
          disabled={page >= totalPage}
          onClick={() => setPage((p) => p + 1)}
        >
          Trang sau
        </button>
      </div>

      <VehicleFormModal
        open={openForm}
        mode={formMode}
        vehicle={selectedVehicle}
        options={options}
        loading={createMutation.isPending || updateMutation.isPending}
        onClose={() => setOpenForm(false)}
        onSubmit={(payload) => {
          if (formMode === "CREATE") {
            createMutation.mutate(payload as any, {
              onSuccess: () => {
                setOpenForm(false);
                toast.success("Thêm xe thành công");
              },
              onError: (error: any) => toast.error(error.message),
            });
            return;
          }

          if (!selectedVehicle) return;

          updateMutation.mutate(
            {
              vehicleId: selectedVehicle.vehicleId,
              payload: payload as any,
            },
            {
              onSuccess: () => {
                setOpenForm(false);
                toast.success("Cập nhật xe thành công");
              },
              onError: (error: any) => toast.error(error.message),
            },
          );
        }}
      />

      {/* MODAL XÁC NHẬN UX MỚI CHO HÀNH ĐỘNG NGƯNG SỬ DỤNG XE */}
      {vehicleToInactive && (
        <div className={styles.modalOverlay}>
          <div className={styles.confirmModal}>
            <div className={styles.confirmHeader}>
              <div className={styles.warnIcon}>⚠️</div>
              <h3>Xác nhận ngừng vận hành xe</h3>
            </div>

            <div className={styles.confirmBody}>
              <p>
                Bạn có chắc chắn muốn ngưng sử dụng xe có biển số{" "}
                <strong>{vehicleToInactive.licensePlate}</strong> không?
              </p>
              <p
                style={{
                  fontSize: "12.5px",
                  color: "#ef4444",
                  marginTop: "8px",
                }}
              >
                * Lưu ý: Xe sẽ không thể tiếp tục điều phối vào các chuyến đi
                mới cho đến khi trạng thái được kích hoạt lại.
              </p>
            </div>

            <div className={styles.confirmActions}>
              <button
                className={styles.cancelModalBtn}
                onClick={() => setVehicleToInactive(null)}
                disabled={statusMutation.isPending}
              >
                Hủy bỏ
              </button>
              <button
                className={styles.executeModalBtn}
                onClick={handleConfirmInactive}
                disabled={statusMutation.isPending}
              >
                {statusMutation.isPending ? "Đang xử lý..." : "Xác nhận ngưng"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
