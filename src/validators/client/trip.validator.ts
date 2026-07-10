import { z } from "zod";

const optionalNumber = (defaultValue: number) =>
  z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) {
      return undefined;
    }
    return Number(value);
  }, z.number().min(1).default(defaultValue));
const stringArray = z.preprocess((value) => {
  if (typeof value === "string") {
    return value.split(",").filter(Boolean);
  }
  if (Array.isArray(value)) return value;
  return [];
}, z.array(z.string()));
export const searchTripsSchema = z.object({
  originCityId: z.coerce.number().nullable(),
  destinationCityId: z.coerce.number().nullable(),

  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),

  page: optionalNumber(1),
  limit: optionalNumber(10),

  timeSlots: stringArray,
  vehicleTypes: stringArray,
  seatPositions: stringArray,
  floors: stringArray,

  // FE sort format
  sort: z.preprocess(
    (value) => {
      if (typeof value !== "string") {
        return undefined;
      }

      const [field, order] = value.split("_");

      return {
        field,
        order,
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

  onlyAvailable: z.coerce.boolean().optional(),
});

export type SearchTripsInput = z.infer<typeof searchTripsSchema>;
