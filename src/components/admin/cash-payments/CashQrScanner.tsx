"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BrowserMultiFormatReader,
  type IScannerControls,
} from "@zxing/browser";
import { Camera, CameraOff, RefreshCw, Power } from "lucide-react";
import styles from "./CashQrScanner.module.css";

interface CashQrScannerProps {
  enabled: boolean;
  onDetected: (value: string) => void;
  onToggleCamera: () => void;
}

type ScannerState = "IDLE" | "STARTING" | "SCANNING" | "ERROR";

const SCAN_COOLDOWN_MS = 2500;

export default function CashQrScanner({
  enabled,
  onDetected,
  onToggleCamera,
}: CashQrScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const onDetectedRef = useRef(onDetected);
  const scannerSessionRef = useRef(0);
  const lastResultRef = useRef<{ value: string; detectedAt: number } | null>(
    null,
  );

  const [scannerState, setScannerState] = useState<ScannerState>("IDLE");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  const stopMediaTracks = useCallback(() => {
    const video = videoRef.current;
    const stream =
      video?.srcObject instanceof MediaStream ? video.srcObject : null;
    stream?.getTracks().forEach((track) => track.stop());

    if (video) {
      video.pause();
      video.srcObject = null;
      video.removeAttribute("src");
      video.load();
    }
  }, []);

  const stopScanner = useCallback(() => {
    scannerSessionRef.current += 1;
    try {
      controlsRef.current?.stop();
    } catch (error) {
      console.warn("[STOP CASH QR SCANNER CONTROLS ERROR]", error);
    }
    controlsRef.current = null;
    stopMediaTracks();
    setScannerState("IDLE");
    setErrorMessage("");
  }, [stopMediaTracks]);

  const startScanner = useCallback(async () => {
    if (!enabled || !videoRef.current) return;

    if (!window.isSecureContext) {
      setScannerState("ERROR");
      setErrorMessage("Camera chỉ hoạt động trên HTTPS hoặc localhost.");
      return;
    }

    try {
      controlsRef.current?.stop();
    } catch {}
    controlsRef.current = null;
    stopMediaTracks();

    const currentSession = scannerSessionRef.current + 1;
    scannerSessionRef.current = currentSession;

    setScannerState("STARTING");
    setErrorMessage("");

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setScannerState("ERROR");
      setErrorMessage("Trình duyệt không hỗ trợ truy cập camera.");
      return;
    }

    const reader = new BrowserMultiFormatReader();

    try {
      const controls = await reader.decodeFromConstraints(
        {
          audio: false,
          video: { facingMode: { exact: "environment" } },
        },
        videoRef.current,
        (result) => {
          if (!result) return;
          const value = result.getText().trim();
          if (!value) return;

          const now = Date.now();
          const previous = lastResultRef.current;

          if (
            previous &&
            previous.value === value &&
            now - previous.detectedAt < SCAN_COOLDOWN_MS
          ) {
            return;
          }

          lastResultRef.current = { value, detectedAt: now };
          onDetectedRef.current(value);
        },
      );

      if (scannerSessionRef.current !== currentSession || !enabled) {
        controls.stop();
        stopMediaTracks();
        return;
      }

      controlsRef.current = controls;
      setScannerState("SCANNING");
    } catch (error: unknown) {
      if (scannerSessionRef.current !== currentSession) return;
      console.error("[CASH QR SCANNER ERROR]", error);
      stopMediaTracks();
      setScannerState("ERROR");
      setErrorMessage(getCameraErrorMessage(error));
    }
  }, [enabled, stopMediaTracks]);

  useEffect(() => {
    if (enabled) {
      void startScanner();
    } else {
      stopScanner();
    }

    return () => {
      scannerSessionRef.current += 1;
      try {
        controlsRef.current?.stop();
      } catch {}
      controlsRef.current = null;
      stopMediaTracks();
    };
  }, [enabled, startScanner, stopScanner, stopMediaTracks]);

  const isCameraActive = enabled && scannerState !== "ERROR";

  return (
    <section className={styles.scannerCard}>
      <div className={styles.scannerHeader}>
        <div>
          <h3>Camera quét QR tại quầy</h3>
          <p>Đặt mã QR của khách hàng vào giữa khung hình.</p>
        </div>
        <span
          className={`${styles.statusBadge} ${
            scannerState === "SCANNING"
              ? styles.statusActive
              : scannerState === "ERROR"
                ? styles.statusError
                : styles.statusWaiting
          }`}
        >
          {getScannerStatusLabel(scannerState)}
        </span>
      </div>

      <div className={styles.videoFrame}>
        <video
          ref={videoRef}
          className={styles.video}
          muted
          playsInline
          autoPlay
        />

        {/* LỚP PHỦ TIÊU ĐIỂM QUÉT */}
        <div className={styles.scanOverlay}>
          <span className={styles.cornerTopLeft} />
          <span className={styles.cornerTopRight} />
          <span className={styles.cornerBottomLeft} />
          <span className={styles.cornerBottomRight} />
          {scannerState === "SCANNING" && <div className={styles.scanLine} />}
        </div>

        {/* NÚT ĐIỀU KHIỂN NỔI LÊN TRÊN KHUNG CAMERA */}
        <div className={styles.toggleContainer}>
          <button
            type="button"
            onClick={onToggleCamera}
            className={`${styles.toggleButton} ${
              isCameraActive ? styles.toggleActive : styles.toggleInactive
            }`}
          >
            {isCameraActive ? (
              <>
                <Power size={18} />
                Tắt camera
              </>
            ) : (
              <>
                <RefreshCw
                  size={18}
                  className={scannerState === "STARTING" ? styles.spinIcon : ""}
                />
                {scannerState === "ERROR"
                  ? "Thử lại / Bật camera"
                  : "Bật camera"}
              </>
            )}
          </button>
        </div>

        {scannerState === "STARTING" && (
          <div className={styles.videoMessage}>
            <RefreshCw size={34} className={styles.spinIcon} />
            <strong>Đang mở camera...</strong>
          </div>
        )}

        {scannerState === "IDLE" && (
          <div className={styles.videoMessage}>
            <CameraOff size={38} />
            <strong>Camera đang tạm dừng</strong>
          </div>
        )}

        {scannerState === "ERROR" && (
          <div className={styles.videoMessage}>
            <CameraOff size={38} />
            <strong>Không thể sử dụng camera</strong>
            <p>{errorMessage}</p>
          </div>
        )}
      </div>

      <div className={styles.scannerFooter}>
        <div className={styles.scannerHint}>
          <Camera size={18} />
          <span>
            QR hợp lệ có dạng <strong>CASH:PAY...</strong>
          </span>
        </div>
      </div>
    </section>
  );
}

function getScannerStatusLabel(state: ScannerState) {
  switch (state) {
    case "SCANNING":
      return "Đang quét";
    case "STARTING":
      return "Đang khởi động";
    case "ERROR":
      return "Camera gặp lỗi";
    default:
      return "Tạm dừng";
  }
}

function getCameraErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return "Không thể truy cập camera.";
  switch (error.name) {
    case "NotAllowedError":
      return "Bạn chưa cấp quyền sử dụng camera cho trình duyệt.";
    case "NotFoundError":
      return "Không tìm thấy camera trên thiết bị.";
    case "NotReadableError":
      return "Camera đang được ứng dụng khác sử dụng.";
    case "OverconstrainedError":
      return "Camera không đáp ứng cấu hình yêu cầu.";
    case "SecurityError":
      return "Camera chỉ hoạt động trên localhost hoặc website HTTPS.";
    default:
      return error.message || "Không thể truy cập camera.";
  }
}
