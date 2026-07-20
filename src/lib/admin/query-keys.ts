export const adminQueryKeys = {
  auth: {
    root: ["admin", "auth"] as const,

    session: () => [...adminQueryKeys.auth.root, "session"] as const,
  },

  dashboard: {
    root: ["admin", "dashboard"] as const,

    summary: (params?: unknown) =>
      [...adminQueryKeys.dashboard.root, "summary", params] as const,
  },

  users: {
    root: ["admin", "users"] as const,

    list: (params?: unknown) =>
      [...adminQueryKeys.users.root, "list", params] as const,

    detail: (userId: number) =>
      [...adminQueryKeys.users.root, "detail", userId] as const,
  },

  drivers: {
    root: ["admin", "drivers"] as const,

    list: (params?: unknown) =>
      [...adminQueryKeys.drivers.root, "list", params] as const,
  },

  routes: {
    root: ["admin", "routes"] as const,

    list: (params?: unknown) =>
      [...adminQueryKeys.routes.root, "list", params] as const,
  },

  vehicles: {
    root: ["admin", "vehicles"] as const,

    list: (params?: unknown) =>
      [...adminQueryKeys.vehicles.root, "list", params] as const,

    detail: (vehicleId: number) =>
      [...adminQueryKeys.vehicles.root, "detail", vehicleId] as const,
  },

  trips: {
    root: ["admin", "trips"] as const,

    list: (params?: unknown) =>
      [...adminQueryKeys.trips.root, "list", params] as const,
  },

  bookings: {
    root: ["admin", "bookings"] as const,

    list: (params?: unknown) =>
      [...adminQueryKeys.bookings.root, "list", params] as const,
  },

  payments: {
    root: ["admin", "payments"] as const,

    list: (params?: unknown) =>
      [...adminQueryKeys.payments.root, "list", params] as const,
  },

  checkins: {
    root: ["admin", "checkins"] as const,

    dashboard: (params?: unknown) =>
      [...adminQueryKeys.checkins.root, "dashboard", params] as const,
  },
} as const;
