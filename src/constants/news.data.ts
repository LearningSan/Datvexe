import type { NewsItem } from "@/types/client/news/news.type";

export const NEWS_ITEMS: NewsItem[] = [
  {
    id: 1,
    slug: "kinh-nghiem-di-xe-giuong-nam-an-toan",
    title: "Kinh nghiệm đi xe giường nằm an toàn và thoải mái",
    excerpt:
      "Những lưu ý cần thiết giúp hành khách có chuyến đi đường dài an toàn, thoải mái và hạn chế say xe.",
    content: `
      Khi đi xe giường nằm đường dài, hành khách nên có mặt tại điểm đón
      trước giờ khởi hành ít nhất 30 phút.

      Hãy kiểm tra kỹ mã đặt vé, số ghế, giờ khởi hành và địa chỉ điểm đón.
      Những hành khách dễ say xe nên chọn vị trí ở giữa xe, hạn chế sử dụng
      điện thoại và tránh ăn quá no trước khi lên xe.

      Đối với hành lý có giá trị, hành khách nên tự bảo quản và không để
      giấy tờ tùy thân, tiền mặt hoặc thiết bị điện tử trong khoang hành lý.
    `,
    imageUrl: "/images/bus-travel.png",
    category: "Kinh nghiệm",
    publishedAt: "2026-07-10",
    author: "XeKhachPT",
    featured: true,
  },
  {
    id: 2,
    slug: "huong-dan-dat-ve-xe-truc-tuyen",
    title: "Hướng dẫn đặt vé xe trực tuyến nhanh chóng",
    excerpt:
      "Chỉ với vài thao tác, hành khách có thể tìm chuyến, chọn ghế và thanh toán vé trực tuyến.",
    content: `
      Đầu tiên, hành khách chọn điểm đi, điểm đến và ngày khởi hành trên
      trang chủ. Hệ thống sẽ hiển thị danh sách các chuyến xe phù hợp.

      Sau khi chọn chuyến, hành khách tiếp tục chọn ghế, điểm đón, điểm trả
      và nhập thông tin liên hệ.

      Cuối cùng, lựa chọn phương thức thanh toán và hoàn thành giao dịch.
      Vé điện tử sẽ được gửi qua email và lưu trong tài khoản của hành khách.
    `,
    imageUrl: "/images/online-booking.png",
    category: "Hướng dẫn",
    publishedAt: "2026-07-08",
    author: "XeKhachPT",
  },
  {
    id: 3,
    slug: "quy-dinh-hanh-ly-khi-di-xe",
    title: "Quy định hành lý khi đi xe khách",
    excerpt:
      "Các quy định cơ bản về hành lý, hàng hóa ký gửi và vật dụng không được mang lên xe.",
    content: `
      Hành khách nên ghi rõ họ tên và số điện thoại trên hành lý ký gửi.
      Những vật phẩm dễ cháy nổ, hóa chất nguy hiểm và hàng hóa bị pháp luật
      cấm không được phép vận chuyển.

      Đối với hành lý có kích thước lớn, hành khách nên liên hệ trước với
      tổng đài để được hỗ trợ và báo giá phù hợp.
    `,
    imageUrl: "/images/luggage.png",
    category: "Quy định",
    publishedAt: "2026-07-05",
    author: "XeKhachPT",
  },
  {
    id: 4,
    slug: "chinh-sach-doi-huy-ve",
    title: "Chính sách đổi và hủy vé xe",
    excerpt:
      "Thông tin về thời gian được phép đổi vé, phí hủy vé và quy trình hoàn tiền.",
    content: `
      Việc đổi hoặc hủy vé phụ thuộc vào thời gian còn lại trước giờ xe
      khởi hành. Hành khách nên thực hiện yêu cầu càng sớm càng tốt để giảm
      mức phí phát sinh.

      Vé đã sử dụng, vé quá giờ khởi hành hoặc vé thuộc chương trình khuyến
      mãi đặc biệt có thể không được hoàn lại.
    `,
    imageUrl: "/images/refund-ticket.png",
    category: "Chính sách",
    publishedAt: "2026-07-02",
    author: "XeKhachPT",
  },
];
