import { NextRequest } from "next/server";
import cloudinary from "@/lib/server/cloudinary";
import { getAuthUserId } from "@/lib/server/auth-user";
import { successResponse, errorResponse } from "@/lib/server/response";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 2 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    await getAuthUserId(req);

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return errorResponse("Vui lòng chọn ảnh", 400);
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return errorResponse("Chỉ hỗ trợ JPG, PNG hoặc WEBP", 400);
    }

    if (file.size > MAX_SIZE) {
      return errorResponse("Ảnh không được vượt quá 2MB", 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;

    const result = await cloudinary.uploader.upload(base64, {
      folder: "quanlidatvexe/users/avatar",
      resource_type: "image",
    });

    return successResponse({
      avatarUrl: result.secure_url,
      avatarPublicId: result.public_id,
    });
  } catch (error: any) {
    console.error(error);

    if (error.message === "UNAUTHORIZED") {
      return errorResponse("Bạn chưa đăng nhập", 401);
    }

    return errorResponse("Upload ảnh thất bại", 500);
  }
}
