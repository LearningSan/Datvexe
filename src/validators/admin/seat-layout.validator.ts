import { z } from "zod";

export const duplicateSeatLayoutSchema = z.object({
  layoutCode: z.string().min(1, "Vui lòng nhập mã layout mới"),
  layoutName: z.string().min(1, "Vui lòng nhập tên layout mới"),
});

export const updateSeatLayoutStatusSchema = z.object({
  isActive: z.boolean(),
});
