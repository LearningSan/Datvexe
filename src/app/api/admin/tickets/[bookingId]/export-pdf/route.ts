import { NextRequest } from "next/server";
import { getAdminTicketPrintHtml } from "@/services/server/admin/admin-ticket.service";

export async function GET(
  _: NextRequest,
  context: { params: Promise<{ bookingId: string }> },
) {
  const { bookingId } = await context.params;
  const data = await getAdminTicketPrintHtml(Number(bookingId));

  return new Response(data.html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="ticket-${bookingId}.html"`,
    },
  });
}
