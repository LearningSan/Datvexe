import type {
  DashboardData,
  RoutePerformanceData,
} from "@/types/admin/dashboard/dashboard.type";
import {
  findDashboardKpis,
  findRevenueTrend,
  findPaymentSummary,
  findBookingStatusSummary,
  findTopRoutes,
  findUpcomingTrips,
  findRiskItems,
  findReviewSummary,
  findLatestReviews,
  findPaymentMethodChart,
  findTripStatusChart,
  findReviewRatingChart,
  findLowPerformanceTrips,
  findTopSellingRoutes,
  findComparisonOptions,
  findTimeSlotInsight,
  findRoutePerformance,
} from "@/repositories/admin/dashboard.repo";

interface DashboardFilter {
  fromDate: string;
  toDate: string;
}

export async function getDashboardData(
  filter: DashboardFilter,
): Promise<DashboardData> {
  const [
    kpis,
    revenueTrend,
    paymentSummary,
    bookingStatusSummary,
    topRoutes,
    topSellingRoutes,
    upcomingTrips,
    riskItems,
    reviewSummary,
    latestReviews,
    paymentMethodChart,
    tripStatusChart,
    reviewRatingChart,
    comparisonOptions,
    timeSlotInsight,
    lowPerformanceTrips,
  ] = await Promise.all([
    findDashboardKpis(filter),
    findRevenueTrend(filter),
    findPaymentSummary(filter),
    findBookingStatusSummary(filter),
    findTopRoutes(filter),
    findTopSellingRoutes(filter),
    findUpcomingTrips(),
    findRiskItems(),
    findReviewSummary(filter),
    findLatestReviews(filter),
    findPaymentMethodChart(filter),
    findTripStatusChart(filter),
    findReviewRatingChart(filter),
    findComparisonOptions(filter),
    findTimeSlotInsight(filter),
    findLowPerformanceTrips(filter),
  ]);

  return {
    kpis,
    revenueTrend,
    paymentSummary,
    bookingStatusSummary,
    topRoutes,
    topSellingRoutes,
    upcomingTrips,
    riskItems,
    reviewSummary,
    latestReviews,
    paymentMethodChart,
    tripStatusChart,
    reviewRatingChart,
    comparisonOptions,
    timeSlotInsight,
    lowPerformanceTrips,
  };
}
export async function getRoutePerformance(filter: {
  originCityId: number;
  destinationCityId: number;
  fromDate: string;
  toDate: string;
}): Promise<RoutePerformanceData> {
  return await findRoutePerformance(filter);
}