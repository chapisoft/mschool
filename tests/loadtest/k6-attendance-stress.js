import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Định nghĩa các chỉ số đo lường thực chứng
export const errorRate = new Rate('error_rate');
export const latencyP95 = new Trend('attendance_latency_p95');

export const options = {
  stages: [
    { duration: '1m', target: 20 },  // Khởi động tải 20 RPS
    { duration: '3m', target: 60 },  // Giờ cao điểm cổng 60 RPS (2.000 học sinh vào trường)
    { duration: '1m', target: 0 },   // Giảm tải
  ],
  thresholds: {
    'http_req_duration': ['p(95)<80'],  // Cam kết LLD: Độ trễ P95 < 80ms
    'error_rate': ['rate<0.01'],         // Tỷ lệ lỗi cho phép < 1%
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:8080/api/v1/attendance';

export default function () {
  // 1. Kịch bản quẹt thẻ điểm danh bình thường
  const studentIndex = Math.floor(Math.random() * 2000) + 1;
  const identityCode = 'HS2026' + studentIndex.toString().padStart(4, '0');

  const payload = JSON.stringify({
    identityCode: identityCode,
    direction: 'IN',
    cameraId: 'CAM_GATE_01',
    scanTime: new Date().toISOString(),
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'X-Device-Id': 'CAM_GATE_01',
      'X-School-Id': 'a1000000-0000-0000-0000-000000000001',
    },
  };

  const res = http.post(`${BASE_URL}/scan`, payload, params);

  const isSuccess = check(res, {
    'Mã HTTP 200 OK': (r) => r.status === 200,
    'Thời gian phản hồi < 80ms': (r) => r.timings.duration < 80,
  });

  errorRate.add(!isSuccess);
  latencyP95.add(res.timings.duration);

  // 2. Bẫy dữ liệu đồng thời (Concurrency Data Integrity Check)
  // Gửi lại ngay lập tức cùng mã học sinh để kiểm tra bẫy Cooldown 90s Redis
  if (Math.random() < 0.1) {
    const dupeRes = http.post(`${BASE_URL}/scan`, payload, params);
    check(dupeRes, {
      'Khử trùng lặp thành công hoặc nhận mã 200': (r) => r.status === 200 || r.status === 409,
    });
  }

  sleep(0.5);
}
