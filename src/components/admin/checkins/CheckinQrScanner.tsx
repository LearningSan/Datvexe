"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  BrowserMultiFormatReader,
  type IScannerControls,
} from "@zxing/browser";

import {
  Camera,
  CameraOff,
  RefreshCw,
  ScanLine,
} from "lucide-react";

import styles from "./CheckinQrScanner.module.css";

interface CheckinQrScannerProps {
  enabled: boolean;
  onDetected: (value: string) => void;
}

type ScannerState =
  | "IDLE"
  | "STARTING"
  | "SCANNING"
  | "ERROR";

const SCAN_COOLDOWN_MS = 2500;

export default function CheckinQrScanner({
  enabled,
  onDetected,
}: CheckinQrScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const controlsRef = useRef<IScannerControls | null>(
    null,
  );

  const onDetectedRef = useRef(onDetected);

  const scannerSessionRef = useRef(0);

  const lastResultRef = useRef<{
    value: string;
    detectedAt: number;
  } | null>(null);

  const [scannerState, setScannerState] =
    useState<ScannerState>("IDLE");

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  const releaseVideoStream = useCallback(() => {
    const video = videoRef.current;

    const stream =
      video?.srcObject instanceof MediaStream
        ? video.srcObject
        : null;

    stream?.getTracks().forEach((track) => {
      track.stop();
    });

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
      console.warn(
        "[CHECKIN SCANNER STOP ERROR]",
        error,
      );
    }

    controlsRef.current = null;

    releaseVideoStream();

    setScannerState("IDLE");
    setErrorMessage("");
  }, [releaseVideoStream]);

  const handleScanResult = useCallback(
    (rawValue: string) => {
      const value = rawValue.trim();

      if (!value) {
        return;
      }

      const now = Date.now();
      const previous =
        lastResultRef.current;

      if (
        previous &&
        previous.value === value &&
        now - previous.detectedAt <
          SCAN_COOLDOWN_MS
      ) {
        return;
      }

      lastResultRef.current = {
        value,
        detectedAt: now,
      };

      onDetectedRef.current(value);
    },
    [],
  );

  const startWithPreferredCamera =
    useCallback(
      async (
        reader: BrowserMultiFormatReader,
        video: HTMLVideoElement,
      ): Promise<IScannerControls> => {
        const callback = (
          result: {
            getText(): string;
          } | undefined,
        ) => {
          if (!result) {
            return;
          }

          handleScanResult(
            result.getText(),
          );
        };

        try {
          /*
           * Ưu tiên camera sau trên điện thoại.
           */
          return await reader.decodeFromConstraints(
            {
              audio: false,

              video: {
                facingMode: {
                  exact: "environment",
                },
              },
            },
            video,
            callback,
          );
        } catch (error: unknown) {
          if (
            error instanceof Error &&
            error.name !==
              "OverconstrainedError"
          ) {
            throw error;
          }

          /*
           * Một số thiết bị không hỗ trợ exact.
           */
          return reader.decodeFromConstraints(
            {
              audio: false,

              video: {
                facingMode: {
                  ideal: "environment",
                },

                width: {
                  ideal: 1280,
                },

                height: {
                  ideal: 720,
                },
              },
            },
            video,
            callback,
          );
        }
      },
      [handleScanResult],
    );

  const startScanner =
    useCallback(async () => {
      if (
        !enabled ||
        !videoRef.current
      ) {
        return;
      }

      if (
        typeof window !==
          "undefined" &&
        !window.isSecureContext
      ) {
        setScannerState("ERROR");

        setErrorMessage(
          "Camera chỉ hoạt động trên HTTPS hoặc localhost.",
        );

        return;
      }

      if (
        typeof navigator ===
          "undefined" ||
        !navigator.mediaDevices
          ?.getUserMedia
      ) {
        setScannerState("ERROR");

        setErrorMessage(
          "Trình duyệt không hỗ trợ hoặc đang chặn quyền camera.",
        );

        return;
      }

      try {
        controlsRef.current?.stop();
      } catch {
        // Không cần xử lý.
      }

      controlsRef.current = null;

      releaseVideoStream();

      const currentSession =
        scannerSessionRef.current + 1;

      scannerSessionRef.current =
        currentSession;

      setScannerState("STARTING");
      setErrorMessage("");

      const reader =
        new BrowserMultiFormatReader();

      try {
        const controls =
          await startWithPreferredCamera(
            reader,
            videoRef.current,
          );

        if (
          scannerSessionRef.current !==
            currentSession ||
          !enabled
        ) {
          controls.stop();
          releaseVideoStream();
          return;
        }

        controlsRef.current =
          controls;

        setScannerState("SCANNING");
      } catch (error: unknown) {
        if (
          scannerSessionRef.current !==
          currentSession
        ) {
          return;
        }

        console.error(
          "[CHECKIN QR SCANNER ERROR]",
          error,
        );

        releaseVideoStream();

        setScannerState("ERROR");

        setErrorMessage(
          getCameraErrorMessage(error),
        );
      }
    }, [
      enabled,
      releaseVideoStream,
      startWithPreferredCamera,
    ]);

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
      } catch {
        // Không cần xử lý.
      }

      controlsRef.current = null;

      releaseVideoStream();
    };
  }, [
    enabled,
    startScanner,
    stopScanner,
    releaseVideoStream,
  ]);

  return (
    <section
      className={styles.scannerCard}
    >
      <div
        className={styles.scannerHeader}
      >
        <div>
          <h3>Quét QR check-in</h3>

          <p>
            Đặt mã QR vé điện tử vào giữa
            khung camera.
          </p>
        </div>

        <span
          className={`${styles.statusBadge} ${
            scannerState ===
            "SCANNING"
              ? styles.statusActive
              : scannerState ===
                  "ERROR"
                ? styles.statusError
                : styles.statusWaiting
          }`}
        >
          {getScannerStatusLabel(
            scannerState,
          )}
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

        <div
          className={styles.scanOverlay}
        >
          <span
            className={
              styles.cornerTopLeft
            }
          />

          <span
            className={
              styles.cornerTopRight
            }
          />

          <span
            className={
              styles.cornerBottomLeft
            }
          />

          <span
            className={
              styles.cornerBottomRight
            }
          />

          {scannerState ===
            "SCANNING" && (
            <div
              className={styles.scanLine}
            />
          )}
        </div>

        {scannerState ===
          "STARTING" && (
          <div
            className={
              styles.videoMessage
            }
          >
            <RefreshCw
              size={36}
              className={
                styles.spinIcon
              }
            />

            <strong>
              Đang mở camera...
            </strong>
          </div>
        )}

        {scannerState ===
          "IDLE" && (
          <div
            className={
              styles.videoMessage
            }
          >
            <CameraOff size={42} />

            <strong>
              Camera đang tạm dừng
            </strong>
          </div>
        )}

        {scannerState ===
          "ERROR" && (
          <div
            className={
              styles.videoMessage
            }
          >
            <CameraOff size={42} />

            <strong>
              Không thể sử dụng camera
            </strong>

            <p>{errorMessage}</p>
          </div>
        )}
      </div>

      <div
        className={styles.scannerFooter}
      >
        <div
          className={
            styles.scannerHint
          }
        >
          <ScanLine size={18} />

          <span>
            Chỉ chấp nhận QR check-in
            do XeKhachPT phát hành.
          </span>
        </div>

        {scannerState ===
          "ERROR" && (
          <button
            type="button"
            className={
              styles.retryButton
            }
            onClick={() => {
              void startScanner();
            }}
          >
            <RefreshCw size={17} />
            Mở lại camera
          </button>
        )}

        {scannerState ===
          "SCANNING" && (
          <div
            className={
              styles.scanningText
            }
          >
            <Camera size={17} />
            Đang nhận diện QR
          </div>
        )}
      </div>
    </section>
  );
}

function getScannerStatusLabel(
  state: ScannerState,
) {
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

function getCameraErrorMessage(
  error: unknown,
) {
  if (!(error instanceof Error)) {
    return "Không thể truy cập camera.";
  }

  switch (error.name) {
    case "NotAllowedError":
      return "Bạn chưa cấp quyền sử dụng camera cho trình duyệt.";

    case "NotFoundError":
      return "Không tìm thấy camera trên thiết bị.";

    case "NotReadableError":
      return "Camera đang được ứng dụng khác sử dụng.";

    case "OverconstrainedError":
      return "Không tìm thấy camera phù hợp.";

    case "SecurityError":
      return "Camera chỉ hoạt động trên HTTPS hoặc localhost.";

    default:
      return (
        error.message ||
        "Không thể truy cập camera."
      );
  }
}