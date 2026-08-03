import { z } from "zod";

const optionalNumber = (defaultValue: number, maximum?: number) =>
  z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined) {
        return undefined;
      }

      return Number(value);
    },
    maximum
      ? z.number().int().min(1).max(maximum).default(defaultValue)
      : z.number().int().min(1).default(defaultValue),
  );

const stringArray = z.preprocess((value) => {
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}, z.array(z.string()));

const queryBoolean = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") {
    return false;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (value === "true" || value === "1") {
    return true;
  }

  if (value === "false" || value === "0") {
    return false;
  }

  return value;
}, z.boolean().default(false));

export const searchTripsSchema = z.object({
  originCityId: z.coerce.number().int().positive(),
  destinationCityId: z.coerce.number().int().positive(),

  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),

  requiredSeats: optionalNumber(1, 5),

  page: optionalNumber(1),
  limit: optionalNumber(10, 50),

  timeSlots: stringArray,
  vehicleTypes: stringArray,
  seatPositions: stringArray,
  floors: stringArray,

  sort: z.preprocess(
    (value) => {
      if (typeof value !== "string") {
        return undefined;
      }

      const separatorIndex = value.lastIndexOf("_");

      if (separatorIndex === -1) {
        return undefined;
      }

      return {
        field: value.slice(0, separatorIndex),
        order: value.slice(separatorIndex + 1),
      };
    },
    z
      .object({
        field: z.enum(["price", "departure", "availableSeats"]),
        order: z.enum(["asc", "desc"]),
      })
      .default({
        field: "price",
        order: "asc",
      }),
  ),

  onlyAvailable: queryBoolean,
});

export type SearchTripsInput = z.infer<typeof searchTripsSchema>;
