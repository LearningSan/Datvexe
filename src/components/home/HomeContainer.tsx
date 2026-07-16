"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import styles from "./HomeContainer.module.css";

import { usePopularRoutes } from "@/hooks/client/useRoute";
import { usePromotions } from "@/hooks/client/usePromotion";
import { useSearchStore, RecentSearch } from "@/store/search.store";
import { useTripFilterStore } from "@/store/filter.store";
import BlockQueryState from "@/components/common/BlockQueryState";
import BlockErrorState from "@/components/common/BlockErrorState";
import { SelectedLocation } from "@/types/client/route/location-search.type";

import SearchForm from "./Search/SearchForm";
import PromoSection from "./Promo/PromoSection";
import PopularRoutes from "./Popular/PopularRoutes";
import HomeStatistics from "./Statistics/HomeStatistics";
import BlockErrorBoundary from "@/components/common/BlockErrorBoundary";
import BlockSkeleton from "@/components/common/BlockSkeleton";

export default function HomeContainer() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { setFilters } = useTripFilterStore();
  const { recentSearches, setSearch } = useSearchStore();

  const [isRoundTrip, setIsRoundTrip] = useState(false);
  const [departureDate, setDepartureDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [returnDate, setReturnDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [ticketCount, setTicketCount] = useState(1);

  const [origin, setOrigin] = useState<SelectedLocation | null>(null);
  const [destination, setDestination] = useState<SelectedLocation | null>(null);
  useEffect(() => {
    const originId = Number(searchParams.get("origin"));
    const destinationId = Number(searchParams.get("destination"));

    const originLabel = searchParams.get("originLabel");

    const destinationLabel = searchParams.get("destinationLabel");

    if (Number.isInteger(originId) && originId > 0 && originLabel) {
      setOrigin({
        type: "CITY",
        id: originId,
        label: originLabel,
      });
    }

    if (
      Number.isInteger(destinationId) &&
      destinationId > 0 &&
      destinationLabel
    ) {
      setDestination({
        type: "CITY",
        id: destinationId,
        label: destinationLabel,
      });
    }
  }, [searchParams]);
  const {
    data: popularRoutes,
    isPending: routesPending,
    isError: routesIsError,
    error: routesError,
    refetch: refetchPopularRoutes,
  } = usePopularRoutes();

  const {
    data: promotions,
    isPending: promotionsPending,
    isError: promotionsIsError,
    error: promotionsError,
    refetch: refetchPromotions,
  } = usePromotions();

  const handleSwap = () => {
    setOrigin(destination);
    setDestination(origin);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!origin || !destination || !departureDate) return;

    setSearch({
      origin,
      destination,
      departureDate,
      ticketCount,
    });

    setFilters({
      originCityId: origin.id,
      destinationCityId: destination.id,
      date: departureDate,
      page: 1,
      limit: 10,
      timeSlots: [],
      vehicleTypes: [],
      seatPositions: [],
      floors: [],
      sort: {
        field: "price",
        order: "asc",
      },
      onlyAvailable: false,
    });

    router.push("/trips");
  };

  function getTodayLocal() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  const handleSelectHistory = (item: RecentSearch) => {
    const today = getTodayLocal();

    const validDepartureDate =
      item.departureDate < today ? today : item.departureDate;

    setOrigin(item.origin);
    setDestination(item.destination);
    setDepartureDate(validDepartureDate);
    setTicketCount(item.ticketCount);
  };

  return (
    <div className={styles.container}>
      <div className={styles.heroScene}>
        <div className={`${styles.sceneSide} ${styles.sceneLeft}`}>
          <JungleSide />
        </div>

        <div className={styles.heroCenter}>
          <div className={styles.busImageWrapper}>
            <img src="/images/bus.png" alt="bus" className={styles.busImage} />

            <img
              src="/images/flora-fauna/vine.png"
              alt=""
              aria-hidden="true"
              className={styles.vineLeft}
            />

            <img
              src="/images/flora-fauna/vine.png"
              alt=""
              aria-hidden="true"
              className={styles.vineRight}
            />

            <img
              src="/images/flora-fauna/monkey.png"
              alt=""
              aria-hidden="true"
              className={styles.monkey}
            />

            <img
              src="/images/flora-fauna/bird.gif"
              alt=""
              aria-hidden="true"
              className={`${styles.bird} ${styles.bird1}`}
            />

            <img
              src="/images/flora-fauna/bird.gif"
              alt=""
              aria-hidden="true"
              className={`${styles.bird} ${styles.bird2}`}
            />

            <img
              src="/images/flora-fauna/bird.gif"
              alt=""
              aria-hidden="true"
              className={`${styles.bird} ${styles.bird3}`}
            />

            <img
              src="/images/flora-fauna/butterfly.gif"
              alt=""
              aria-hidden="true"
              className={`${styles.butterfly} ${styles.butterfly1}`}
            />

            <img
              src="/images/flora-fauna/butterfly.gif"
              alt=""
              aria-hidden="true"
              className={`${styles.butterfly} ${styles.butterfly2}`}
            />
          </div>

          <BlockErrorBoundary fallback={<BlockSkeleton height={320} />}>
            <div className={styles.searchFormCol}>
              <SearchForm
                isRoundTrip={isRoundTrip}
                setIsRoundTrip={setIsRoundTrip}
                origin={origin}
                setOrigin={setOrigin}
                destination={destination}
                setDestination={setDestination}
                departureDate={departureDate}
                setDepartureDate={setDepartureDate}
                returnDate={returnDate}
                setReturnDate={setReturnDate}
                ticketCount={ticketCount}
                setTicketCount={setTicketCount}
                onSwap={handleSwap}
                onSubmit={handleSubmit}
                recentSearches={recentSearches}
                onSelectHistory={handleSelectHistory}
              />
            </div>
          </BlockErrorBoundary>
        </div>

        <div className={`${styles.sceneSide} ${styles.sceneRight}`}>
          <OceanSide />
        </div>
      </div>

      <BlockErrorBoundary
        fallback={
          <BlockErrorState
            height={180}
            title="Khu vực khuyến mãi gặp lỗi"
            message="Không thể hiển thị khu vực khuyến mãi."
          />
        }
      >
        <BlockQueryState
          isPending={promotionsPending}
          isError={promotionsIsError}
          hasData={promotions !== undefined}
          height={180}
          errorTitle="Không thể tải khuyến mãi"
          errorMessage={
            (promotionsError as any)?.response?.data?.message ||
            (promotionsError as any)?.message ||
            "Khu vực khuyến mãi tạm thời không khả dụng."
          }
          onRetry={() => {
            void refetchPromotions();
          }}
        >
          <PromoSection promotionsList={promotions ?? []} />
        </BlockQueryState>
      </BlockErrorBoundary>

      <BlockErrorBoundary
        fallback={
          <BlockErrorState
            height={220}
            title="Khu vực tuyến phổ biến gặp lỗi"
            message="Không thể hiển thị khu vực tuyến phổ biến."
          />
        }
      >
        <BlockQueryState
          isPending={routesPending}
          isError={routesIsError}
          hasData={popularRoutes !== undefined}
          height={220}
          errorTitle="Không thể tải tuyến phổ biến"
          errorMessage={
            (routesError as any)?.response?.data?.message ||
            (routesError as any)?.message ||
            "Danh sách tuyến phổ biến tạm thời không khả dụng."
          }
          onRetry={() => {
            void refetchPopularRoutes();
          }}
        >
          <PopularRoutes data={popularRoutes ?? []} />
        </BlockQueryState>
      </BlockErrorBoundary>

      <BlockErrorBoundary
        fallback={
          <BlockErrorState height={180} title="Không thể hiển thị thống kê" />
        }
      >
        <HomeStatistics />
      </BlockErrorBoundary>
    </div>
  );
}

function JungleSide() {
  const Leaf = ({ className, fill }: { className: string; fill: string }) => (
    <svg className={`${styles.plant} ${className}`} viewBox="0 0 80 110">
      <path d="M40,100 Q8,55 12,20 Q30,0 62,18 Q75,55 40,100Z" fill={fill} />
      <path
        d="M40,100 Q37,55 35,18"
        stroke="#16541f"
        strokeWidth="1.5"
        fill="none"
        opacity=".55"
      />
    </svg>
  );

  const FallingLeaf = ({ className }: { className: string }) => (
    <svg className={`${styles.plant} ${className}`} viewBox="0 0 16 16">
      <ellipse
        cx="8"
        cy="8"
        rx="7"
        ry="5"
        fill="#4dc060"
        opacity=".8"
        transform="rotate(-30,8,8)"
      />
    </svg>
  );

  return (
    <>
      <svg className={`${styles.plant} ${styles.vineL}`} viewBox="0 0 40 200">
        <path
          d="M20,0 Q5,40 22,80 Q38,120 18,160 Q5,185 20,200"
          stroke="#3a8a40"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        <ellipse
          cx="28"
          cy="50"
          rx="14"
          ry="9"
          fill="#2a7a2a"
          transform="rotate(-20,28,50)"
        />
        <ellipse
          cx="12"
          cy="110"
          rx="12"
          ry="8"
          fill="#38a038"
          transform="rotate(15,12,110)"
        />
        <ellipse
          cx="26"
          cy="168"
          rx="11"
          ry="7"
          fill="#2a7a2a"
          transform="rotate(-10,26,168)"
        />
      </svg>

      <svg className={`${styles.plant} ${styles.vineL2}`} viewBox="0 0 40 200">
        <path
          d="M18,0 Q32,42 16,78 Q2,116 22,158 Q34,184 18,200"
          stroke="#48a34d"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        <ellipse
          cx="12"
          cy="55"
          rx="12"
          ry="8"
          fill="#37a747"
          transform="rotate(20,12,55)"
        />
        <ellipse
          cx="28"
          cy="125"
          rx="13"
          ry="8"
          fill="#2f8f39"
          transform="rotate(-18,28,125)"
        />
      </svg>

      <Leaf className={styles.leafBigL} fill="#1e6b2a" />
      <Leaf className={styles.leafMidL} fill="#27873a" />
      <Leaf className={styles.leafTopL} fill="#32a045" />
      <Leaf className={styles.leafBottomL} fill="#208030" />
      <Leaf className={styles.leafUpperL} fill="#46b856" />
      <Leaf className={styles.leafFarL} fill="#2f9c42" />

      <FallingLeaf className={styles.fallingLeaf} />
      <FallingLeaf className={styles.fallingLeaf2} />
      <FallingLeaf className={styles.fallingLeaf3} />
      <FallingLeaf className={styles.fallingLeaf4} />

      <svg
        className={`${styles.plant} ${styles.jungleHill}`}
        viewBox="0 0 110 60"
      >
        <path
          d="M0,60 Q20,20 40,40 Q60,55 80,25 Q95,10 110,35 L110,60Z"
          fill="#163d1a"
        />
        <circle cx="18" cy="40" r="5" fill="#2a6a2a" opacity=".6" />
        <circle cx="55" cy="45" r="4" fill="#2a6a2a" opacity=".5" />
        <circle cx="88" cy="32" r="6" fill="#1e5a1e" opacity=".6" />
      </svg>
    </>
  );
}

function OceanSide() {
  const Fish = ({
    className,
    body,
    tail,
  }: {
    className: string;
    body: string;
    tail: string;
  }) => (
    <svg className={`${styles.plant} ${className}`} viewBox="0 0 44 20">
      <ellipse cx="22" cy="10" rx="16" ry="7" fill={body} />
      <polygon points="6,10 0,3 0,17" fill={tail} />
      <circle cx="30" cy="8" r="2" fill="#333" />
      <path d="M20,6 Q26,4 32,7" stroke={tail} strokeWidth="1" fill="none" />
    </svg>
  );

  const Bubble = ({ className }: { className: string }) => (
    <svg className={`${styles.plant} ${className}`} viewBox="0 0 8 8">
      <circle
        cx="4"
        cy="4"
        r="3.5"
        fill="none"
        stroke="#a0d8f0"
        strokeWidth="1"
      />
    </svg>
  );

  const Seaweed = ({ className }: { className: string }) => (
    <svg className={`${styles.plant} ${className}`} viewBox="0 0 35 80">
      <path
        d="M17,80 Q5,60 18,45 Q30,30 17,15 Q10,5 17,0"
        stroke="#1a8a5a"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />
      <ellipse
        cx="22"
        cy="38"
        rx="10"
        ry="6"
        fill="#1a7a4a"
        transform="rotate(20,22,38)"
      />
      <ellipse
        cx="12"
        cy="20"
        rx="9"
        ry="5"
        fill="#22904a"
        transform="rotate(-15,12,20)"
      />
    </svg>
  );

  return (
    <>
      <svg className={`${styles.plant} ${styles.cloud}`} viewBox="0 0 55 28">
        <ellipse cx="27" cy="18" rx="26" ry="10" fill="#c8e8f8" />
        <ellipse cx="18" cy="14" rx="14" ry="12" fill="#d8f0ff" />
        <ellipse cx="36" cy="12" rx="12" ry="10" fill="#d8f0ff" />
      </svg>

      <svg className={`${styles.plant} ${styles.cloud2}`} viewBox="0 0 55 28">
        <ellipse cx="27" cy="18" rx="26" ry="10" fill="#c8e8f8" />
        <ellipse cx="18" cy="14" rx="14" ry="12" fill="#d8f0ff" />
        <ellipse cx="36" cy="12" rx="12" ry="10" fill="#d8f0ff" />
      </svg>

      <svg className={`${styles.plant} ${styles.waveTop}`} viewBox="0 0 110 80">
        <path
          d="M0,30 Q15,10 30,28 Q45,46 60,26 Q75,8 90,24 Q105,38 110,28 L110,0 L0,0Z"
          fill="#0d5a8a"
          opacity=".6"
        />
        <path
          d="M0,45 Q18,25 36,42 Q54,58 72,38 Q90,20 110,40 L110,0 L0,0Z"
          fill="#0d4a7a"
          opacity=".5"
        />
      </svg>

      <Fish className={styles.fish1} body="#f0a030" tail="#e07820" />
      <Fish className={styles.fish2} body="#5ab8d8" tail="#3a98b8" />
      <Fish className={styles.fish3} body="#f6c25a" tail="#dc8b28" />
      <Fish className={styles.fish4} body="#75d0e8" tail="#3aa6c2" />
      <Fish className={styles.fish5} body="#ff9f7a" tail="#d86a4a" />

      <Bubble className={styles.bubble1} />
      <Bubble className={styles.bubble2} />
      <Bubble className={styles.bubble3} />
      <Bubble className={styles.bubble4} />
      <Bubble className={styles.bubble5} />
      <Bubble className={styles.bubble6} />

      <svg className={`${styles.plant} ${styles.waveBot}`} viewBox="0 0 110 30">
        <path
          d="M0,15 Q18,2 36,15 Q54,28 72,14 Q90,2 110,14 L110,30 L0,30Z"
          fill="#0a4870"
          opacity=".7"
        />
      </svg>

      <svg
        className={`${styles.plant} ${styles.waveBot2}`}
        viewBox="0 0 110 22"
      >
        <path
          d="M0,12 Q20,2 40,12 Q60,22 80,10 Q95,2 110,12 L110,22 L0,22Z"
          fill="#083a5a"
          opacity=".6"
        />
      </svg>

      <Seaweed className={styles.seaweed} />
      <Seaweed className={styles.seaweed2} />
      <Seaweed className={styles.seaweed3} />

      <svg className={`${styles.plant} ${styles.coralR}`} viewBox="0 0 80 70">
        <path
          d="M40,70 L40,30"
          stroke="#c84040"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M40,45 Q20,30 15,10"
          stroke="#c84040"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M40,38 Q58,24 62,8"
          stroke="#d05050"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="15" cy="10" r="7" fill="#e05050" />
        <circle cx="62" cy="8" r="7" fill="#c84040" />
        <circle cx="40" cy="30" r="6" fill="#d84a4a" />
      </svg>

      <svg className={`${styles.plant} ${styles.coralR2}`} viewBox="0 0 55 55">
        <path
          d="M27,55 L27,25"
          stroke="#e07820"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M27,38 Q12,28 10,10"
          stroke="#e07820"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M27,32 Q40,22 43,8"
          stroke="#d06a18"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="10" cy="10" r="5" fill="#f09030" />
        <circle cx="43" cy="8" r="5" fill="#e07820" />
        <circle cx="27" cy="25" r="4" fill="#f09030" />
      </svg>
    </>
  );
}
