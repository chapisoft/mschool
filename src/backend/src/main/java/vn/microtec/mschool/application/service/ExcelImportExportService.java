package vn.microtec.mschool.application.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.streaming.SXSSFSheet;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;
import org.springframework.stereotype.Service;
import vn.microtec.mschool.domain.attendance.DailyAttendanceSession;
import vn.microtec.mschool.infrastructure.persistence.AttendanceRecordRepository;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExcelImportExportService {

    private final AttendanceRecordRepository recordRepository;

    /**
     * Xuất sổ điểm danh học sinh theo ngày sử dụng Apache POI SXSSF Streaming.
     * Tối ưu hóa bộ nhớ RAM, chống lỗi OutOfMemoryError khi xử lý số lượng lớn.
     */
    public byte[] exportDailyAttendanceExcel(LocalDate date) throws IOException {
        List<DailyAttendanceSession> sessions = recordRepository.findBySessionDate(date);

        // Giữ tối đa 100 dòng trong RAM, các dòng cũ tự động ghi xuống đĩa tạm
        try (SXSSFWorkbook workbook = new SXSSFWorkbook(100);
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            SXSSFSheet sheet = workbook.createSheet("Sổ Điểm Danh " + date.toString());
            sheet.trackAllColumnsForAutoSizing();

            // 1. Tạo kiểu tiêu đề chính
            CellStyle titleStyle = workbook.createCellStyle();
            Font titleFont = workbook.createFont();
            titleFont.setBold(true);
            titleFont.setFontHeightInPoints((short) 14);
            titleStyle.setFont(titleFont);
            titleStyle.setAlignment(HorizontalAlignment.CENTER);

            // Dòng tiêu đề
            Row titleRow = sheet.createRow(0);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("SỔ THEO DÕI ĐIỂM DANH HỌC SINH - NGÀY " + date.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));
            titleCell.setCellStyle(titleStyle);

            // 2. Tạo kiểu Header bảng
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.ROYAL_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            headerStyle.setBorderBottom(BorderStyle.THIN);
            headerStyle.setBorderTop(BorderStyle.THIN);
            headerStyle.setBorderLeft(BorderStyle.THIN);
            headerStyle.setBorderRight(BorderStyle.THIN);

            String[] headers = {
                    "STT", "Mã Học Sinh", "Ngày Học", "Thời Khắc Vào",
                    "Thời Khắc Ra", "Tổng Phút Có Mặt", "Trạng Thái Chuyên Cần", "Ghi Chú"
            };

            Row headerRow = sheet.createRow(2);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // 3. Định dạng dữ liệu các dòng
            CellStyle dataStyle = workbook.createCellStyle();
            dataStyle.setBorderBottom(BorderStyle.THIN);
            dataStyle.setBorderTop(BorderStyle.THIN);
            dataStyle.setBorderLeft(BorderStyle.THIN);
            dataStyle.setBorderRight(BorderStyle.THIN);

            DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("HH:mm:ss");

            int rowIdx = 3;
            int stt = 1;
            for (DailyAttendanceSession s : sessions) {
                Row row = sheet.createRow(rowIdx++);

                Cell c0 = row.createCell(0);
                c0.setCellValue(stt++);
                c0.setCellStyle(dataStyle);

                Cell c1 = row.createCell(1);
                c1.setCellValue(s.getIdentityCode());
                c1.setCellStyle(dataStyle);

                Cell c2 = row.createCell(2);
                c2.setCellValue(s.getSessionDate().toString());
                c2.setCellStyle(dataStyle);

                Cell c3 = row.createCell(3);
                c3.setCellValue(s.getCheckInAt() != null ? s.getCheckInAt().format(timeFormatter) : "--:--:--");
                c3.setCellStyle(dataStyle);

                Cell c4 = row.createCell(4);
                c4.setCellValue(s.getCheckOutAt() != null ? s.getCheckOutAt().format(timeFormatter) : "--:--:--");
                c4.setCellStyle(dataStyle);

                Cell c5 = row.createCell(5);
                c5.setCellValue(s.getTotalPresentMinutes() != null ? s.getTotalPresentMinutes() : 0);
                c5.setCellStyle(dataStyle);

                Cell c6 = row.createCell(6);
                c6.setCellValue(s.getAttendanceStatus() != null ? s.getAttendanceStatus().name() : "ABSENT");
                c6.setCellStyle(dataStyle);

                Cell c7 = row.createCell(7);
                c7.setCellValue(s.getCheckInCameraId() != null ? "Camera: " + s.getCheckInCameraId() : "Điểm danh tay");
                c7.setCellStyle(dataStyle);
            }

            // Tự động căn chỉnh độ rộng cột
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            log.info("Xuất sổ điểm danh Excel thành công cho ngày: {}, số bản ghi: {}", date, sessions.size());
            return out.toByteArray();
        }
    }
}
