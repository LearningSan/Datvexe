
import styles from "./CancellationPolicyPage.module.css";

export default function CancellationPolicyPage() {
  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <h1>Chính sách hủy vé & hoàn tiền</h1>

        <p className={styles.intro}>
          Hành khách có thể hủy vé đã xác nhận theo thời gian còn lại
          trước giờ khởi hành. Khoản tiền được hoàn sẽ được cộng vào
          ví nội bộ của tài khoản.
        </p>

        <section className={styles.section}>
          <h2>1. Chính sách hủy vé</h2>

          <div className={styles.tableWrapper}>
            <table>
              <thead>
                <tr>
                  <th>Thời gian trước giờ khởi hành</th>
                  <th>Phí hủy</th>
                  <th>Số tiền hoàn</th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td>Từ 48 giờ trở lên</td>
                  <td>0%</td>
                  <td>100%</td>
                </tr>

                <tr>
                  <td>Từ 24 giờ đến dưới 48 giờ</td>
                  <td>0%</td>
                  <td>100%</td>
                </tr>

                <tr>
                  <td>Từ 2 giờ đến dưới 24 giờ</td>
                  <td>10%</td>
                  <td>90%</td>
                </tr>

                <tr>
                  <td>Dưới 2 giờ</td>
                  <td>Không được hủy</td>
                  <td>Không hoàn tiền</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.section}>
          <h2>2. Phương thức hoàn tiền</h2>

          <p>
            Tiền hoàn từ việc hủy vé sẽ được chuyển vào{" "}
            <strong>ví nội bộ</strong> của tài khoản khách hàng.
          </p>

          <p>
            Phương thức thanh toán ban đầu không ảnh hưởng đến phương thức
            hoàn tiền. Điều này áp dụng cho các giao dịch được thanh toán
            bằng MoMo, ZaloPay, VNPay, PayOS, VietQR hoặc các phương thức
            thanh toán khác được hệ thống hỗ trợ.
          </p>
        </section>

        <section className={styles.section}>
          <h2>3. Thời điểm nhận tiền hoàn</h2>

          <p>
            Sau khi yêu cầu hủy vé được xử lý thành công, hệ thống sẽ
            cộng khoản tiền hoàn vào ví nội bộ của khách hàng trong cùng
            quá trình xử lý giao dịch.
          </p>

          <p>
            Khách hàng có thể kiểm tra số dư ví nội bộ sau khi hủy vé
            thành công.
          </p>
        </section>

        <section className={styles.section}>
          <h2>4. Điều kiện hủy vé</h2>

          <ul>
            <li>Vé phải đang ở trạng thái đã xác nhận.</li>
            <li>Chuyến xe chưa khởi hành.</li>
            <li>Yêu cầu hủy phải được thực hiện từ 2 giờ trở lên trước giờ khởi hành.</li>
            <li>Vé đã hủy không thể tiếp tục sử dụng.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>5. Lưu ý</h2>

          <p>
            Số tiền hoàn thực tế được hệ thống tính toán dựa trên tổng
            giá trị vé và chính sách hủy tại thời điểm khách hàng xác nhận
            hủy vé.
          </p>

          <p>
            Trước khi xác nhận hủy, hệ thống sẽ hiển thị phí hủy và số tiền
            dự kiến được hoàn để khách hàng kiểm tra.
          </p>
        </section>
      </div>
    </main>
  );
}

