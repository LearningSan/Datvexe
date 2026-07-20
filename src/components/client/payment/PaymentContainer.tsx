"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import styles from "./PaymentContainer.module.css";
import ErrorRenderer from "@/lib/error/error.renderer";
import { usePaymentStore } from "@/store/payment.store";
import { useRouter } from "next/navigation";

import {
  useBookingSummary,
  useCreatePayment,
  usePaymentStatus,
  useUpdatePaymentMethod,
  useCancelHold,
  useConfirmManualPayment,
} from "@/hooks/client/usePayment";

import { useCancelSeatHoldOnExit } from "@/hooks/client/useCancelSeatHoldOnExit";

import CountdownTimer from "./countdownTimer/CountdownTimer";
import PaymentMethods from "./methods/PaymentMethods";
import QRPayment from "./qr/QRPayment";
import PaymentSummary from "./summary/PaymentSummary";

import {
  PaymentSuccess,
  PaymentFailed,
  PaymentExpired,
} from "./result/PaymentResult";

import BlockErrorBoundary from "@/components/common/BlockErrorBoundary";
import BlockSkeleton from "@/components/common/BlockSkeleton";

interface Props {
  bookingId: number;
}

export default function PaymentContainer({ bookingId }: Props) {
  useCancelSeatHoldOnExit();

  const router = useRouter();

  const initialCreatedRef = useRef(false);
  const expiredHandledRef = useRef(false);
  const methodChangingRef = useRef(false);

  const [sessionId, setSessionId] = useState("");
  const [showDetails, setShowDetails] = useState(false);

  const {
    selectedMethod,
    step,
    paymentId,
    transactionCode,
    qrCodeUrl,
    paymentUrl,
    deeplink,
    flowType,
    uiMode,
    actionText,
    returnUrl,
    cancelUrl,
    manualInfo,
    setMethod,
    setStep,
    setExpiredAt,
    clearPaymentResult,
    reset,
  } = usePaymentStore();

  const summaryQuery = useBookingSummary(bookingId);

  const {
    data: summary,
    isPending: summaryPending,
    isError: summaryIsError,
    error: summaryError,
    refetch: refetchSummary,
  } = summaryQuery;
  const { mutate: createPayment, isPending: isCreating } = useCreatePayment();
  const { mutate: cancelHold } = useCancelHold();

  const { mutate: updatePaymentMethod, isPending: isUpdatingMethod } =
    useUpdatePaymentMethod();

  const { mutate: confirmManualPayment, isPending: isConfirmingManual } =
    useConfirmManualPayment();

  const {
    data: paymentStatus,
    isError: paymentStatusIsError,
    refetch: refetchPaymentStatus,
  } = usePaymentStatus(
    paymentId,
    Boolean(paymentId) && (step === "checkout" || step === "processing"),
  );
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const tripId = summary?.tripId;

  useEffect(() => {
    setSessionId(localStorage.getItem("session_id") ?? "");
  }, []);

  useEffect(() => {
    if (!summary?.holdExpiredAt) return;
    setExpiredAt(summary.holdExpiredAt);
  }, [summary?.holdExpiredAt, setExpiredAt]);

  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  const handleCreatePayment = useCallback(() => {
    if (!sessionId || isCreating || isUpdatingMethod || paymentId) return;

    createPayment({
      bookingId,
      paymentMethod: selectedMethod,
      sessionId,
    });
  }, [
    sessionId,
    isCreating,
    isUpdatingMethod,
    paymentId,
    createPayment,
    bookingId,
    selectedMethod,
  ]);

const handleConfirmManualPayment = useCallback(() => {
  if (!paymentId || isConfirmingManual) return;

  /*
   * Chuyển sang processing ngay khi bắt đầu gửi request.
   * Không đặt processing trong onSuccess vì response có thể về
   * sau khi polling đã chuyển giao diện sang success.
   */
  setPaymentError(null);
  setStep("processing");

  confirmManualPayment(
    { paymentId },
    {
      onSuccess: () => {

        setPaymentError(null);
      },

      onError: (error: any) => {
        const currentStep = usePaymentStore.getState().step;

        if (currentStep !== "success") {
          setPaymentError(
            error?.response?.data?.message ||
              error?.message ||
              "Không thể xác nhận thanh toán. Vui lòng thử lại.",
          );

          setStep("checkout");
        }
      },
    },
  );
}, [
  paymentId,
  isConfirmingManual,
  confirmManualPayment,
  setStep,
]);

  useEffect(() => {
    if (!paymentStatus) return;

    switch (paymentStatus.status) {
      case "PAID":
        setPaymentError(null);
        setStep("success");
        break;

      case "FAILED":
      case "REJECTED":
        setStep("failed");
        break;

      case "EXPIRED":
        setStep("expired");
        break;

      case "PROCESSING":
      case "WAITING_CONFIRM":
        setStep("processing");
        break;
    }
  }, [paymentStatus?.status, setStep]);

  useEffect(() => {
    if (
      initialCreatedRef.current ||
      !summary ||
      !sessionId ||
      paymentId ||
      step !== "checkout"
    ) {
      return;
    }

    initialCreatedRef.current = true;
    setPaymentError(null);

    createPayment(
      {
        bookingId,
        paymentMethod: selectedMethod,
        sessionId,
      },
      {
        onError: (error: any) => {
          setPaymentError(
            error?.response?.data?.message ||
              error?.message ||
              "Không tạo được thanh toán. Vui lòng chọn phương thức khác.",
          );
        },
      },
    );
  }, [
    summary,
    sessionId,
    paymentId,
    step,
    bookingId,
    selectedMethod,
    createPayment,
  ]);

  const handleExpired = useCallback(() => {
    if (
      expiredHandledRef.current ||
      !sessionId ||
      !tripId ||
      step === "success"
    ) {
      return;
    }

    expiredHandledRef.current = true;
    setStep("expired");

    cancelHold({
      bookingId,
      tripId,
      sessionId,
    });
  }, [bookingId, tripId, sessionId, cancelHold, setStep, step]);

  const handleCancel = useCallback(() => {
    if (!sessionId || !tripId) return;

    cancelHold(
      { bookingId, tripId, sessionId },
      {
        onSuccess: () => {
          reset();
          router.replace("/trips");
        },
      },
    );
  }, [bookingId, tripId, sessionId, cancelHold, reset, router]);

  const handleRetry = useCallback(() => {
    initialCreatedRef.current = false;
    methodChangingRef.current = false;
    expiredHandledRef.current = false;

    setPaymentError(null);
    clearPaymentResult();
    setShowDetails(false);
    setStep("checkout");
  }, [clearPaymentResult, setStep]);

  const handleChangeMethod = useCallback(
    (method: typeof selectedMethod) => {
      if (method === selectedMethod) return;
      if (!sessionId) return;
      if (isCreating || isUpdatingMethod) return;
      if (methodChangingRef.current) return;

      methodChangingRef.current = true;

      setMethod(method);
      setStep("checkout");

      const onSettled = () => {
        methodChangingRef.current = false;
      };

      if (paymentId) {
        updatePaymentMethod(
          {
            paymentId,
            bookingId,
            paymentMethod: method,
            sessionId,
          },
          {
            onSuccess: () => {
              setPaymentError(null);
            },
            onError: (error: any) => {
              setPaymentError(
                error?.response?.data?.message ||
                  error?.message ||
                  "Không tạo được thanh toán. Vui lòng chọn phương thức khác.",
              );
            },
            onSettled,
          },
        );
        return;
      }

      createPayment(
        {
          bookingId,
          paymentMethod: method,
          sessionId,
        },
        {
          onSuccess: () => {
            setPaymentError(null);
          },
          onError: (error: any) => {
            setPaymentError(
              error?.response?.data?.message ||
                error?.message ||
                "Không tạo được thanh toán. Vui lòng chọn phương thức khác.",
            );
          },
          onSettled,
        },
      );
    },
    [
      selectedMethod,
      sessionId,
      paymentId,
      bookingId,
      setMethod,
      setStep,
      updatePaymentMethod,
      createPayment,
      isCreating,
      isUpdatingMethod,
    ],
  );

  const paymentData = useMemo(() => {
    if (!summary || !paymentId || !transactionCode || !flowType || !uiMode) {
      return null;
    }

    return {
      paymentId,
      bookingId,
      bookingCode: summary.bookingCode,
      transactionCode,
      paymentMethod: selectedMethod,
      amount: summary.totalAmount,
      status: paymentStatus?.status ?? ("PENDING" as const),

      flowType,
      uiMode,
      actionText,

      qrCodeUrl,
      paymentUrl,
      deeplink,
      returnUrl,
      cancelUrl,
      manualInfo,

      expiredAt: summary.holdExpiredAt ?? "",
    };
  }, [
    summary,
    paymentId,
    bookingId,
    transactionCode,
    selectedMethod,
    paymentStatus?.status,
    flowType,
    uiMode,
    actionText,
    qrCodeUrl,
    paymentUrl,
    deeplink,
    returnUrl,
    cancelUrl,
    manualInfo,
  ]);
  const handleRetrySummary = useCallback(() => {
    void refetchSummary();
  }, [refetchSummary]);
  const isResultStep =
    step === "success" || step === "failed" || step === "expired";
  if (!Number.isFinite(bookingId) || bookingId <= 0) {
    return (
      <ErrorRenderer
        error={{
          response: {
            status: 404,
          },
        }}
      />
    );
  }

  if (summaryPending && !summary) {
    return <BlockSkeleton height={500} />;
  }

  if (summaryIsError && !summary) {
    return <ErrorRenderer error={summaryError} onRetry={handleRetrySummary} />;
  }

  if (!summary) {
    return (
      <ErrorRenderer
        error={{
          response: {
            status: 404,
          },
        }}
        onRetry={handleRetrySummary}
      />
    );
  }
  return (
    <div className={styles.page}>
      <div
        className={styles.container}
        style={{
          maxWidth: isResultStep && !showDetails ? "800px" : "1200px",
          justifyContent:
            isResultStep && !showDetails ? "center" : "flex-start",
          transition: "all 0.3s ease-in-out",
          margin: "0 auto",
          display: "flex",
          width: "100%",
        }}
      >
        {isResultStep ? (
          <div
            style={{
              flex: 1,
              width: "100%",
              marginRight: isResultStep && showDetails ? "24px" : "0px",
              transition: "margin 0.3s ease-in-out",
            }}
          >
            {step === "success" && (
              <PaymentSuccess
                bookingCode={summary.bookingCode}
                onToggleDetails={() => setShowDetails(!showDetails)}
                showDetails={showDetails}
              />
            )}
            {step === "failed" && (
              <PaymentFailed
                bookingId={bookingId}
                onRetry={handleRetry}
                onToggleDetails={() => setShowDetails(!showDetails)}
                showDetails={showDetails}
              />
            )}
            {step === "expired" && (
              <PaymentExpired bookingId={bookingId} />
            )}{" "}
          </div>
        ) : (
          <>
            <div className={styles.leftCol}>
              <BlockErrorBoundary fallback={<BlockSkeleton height={500} />}>
                <PaymentMethods
                  selected={selectedMethod}
                  onChange={handleChangeMethod}
                />
              </BlockErrorBoundary>
            </div>

            <div className={styles.centerCol}>
              <BlockErrorBoundary fallback={<BlockSkeleton height={480} />}>
                <CountdownTimer
                  expiredAt={summary.holdExpiredAt}
                  onExpired={handleExpired}
                />
                {paymentError && (
                  <div
                    style={{
                      marginBottom: 12,
                      padding: "12px 14px",
                      borderRadius: 10,
                      background: "#fff3f3",
                      color: "#b42318",
                      fontWeight: 600,
                      fontSize: 14,
                    }}
                  >
                    {paymentError}
                  </div>
                )}
                {paymentStatusIsError && paymentId && (
                  <div
                    style={{
                      marginBottom: 12,
                      padding: "10px 14px",
                      borderRadius: 10,
                      background: "#fff7ed",
                      color: "#9a3412",
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  >
                    Tạm thời chưa kiểm tra được trạng thái thanh toán.
                    <button
                      type="button"
                      onClick={() => {
                        void refetchPaymentStatus();
                      }}
                      style={{
                        marginLeft: 8,
                        padding: "5px 10px",
                        border: "1px solid #fdba74",
                        borderRadius: 6,
                        background: "#fff",
                        color: "#9a3412",
                        cursor: "pointer",
                      }}
                    >
                      Kiểm tra lại
                    </button>
                  </div>
                )}
                <QRPayment
                  method={selectedMethod}
                  totalAmount={summary.totalAmount}
                  paymentData={paymentData}
                  isSubmitting={
                    isCreating || isUpdatingMethod || isConfirmingManual
                  }
                  onCreatePayment={handleCreatePayment}
                  onConfirmManualPayment={handleConfirmManualPayment}
                />

                <button className={styles.cancelBtn} onClick={handleCancel}>
                  Hủy đặt vé
                </button>
              </BlockErrorBoundary>
            </div>
          </>
        )}

        {(!isResultStep || (isResultStep && showDetails)) && (
          <div
            className={styles.rightCol}
            style={{
              animation: "slideIn 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
              minWidth: "380px",
              flexShrink: 0,
            }}
          >
            <BlockErrorBoundary fallback={<BlockSkeleton height={500} />}>
              <PaymentSummary summary={summary} />
            </BlockErrorBoundary>
          </div>
        )}
      </div>
    </div>
  );
}
