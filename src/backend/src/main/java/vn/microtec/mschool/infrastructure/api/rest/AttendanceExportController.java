package vn.microtec.mschool.infrastructure.api.rest;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.microtec.mschool.application.service.ExcelImportExportService;

import java.io.IOException;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/attendance/export")
@RequiredArgsConstructor
public class AttendanceExportController {

    private final ExcelImportExportService excelService;

    @GetMapping("/excel")
    public ResponseEntity<byte[]> exportExcel(
            @RequestParam(required = false) String date) throws IOException {

        LocalDate targetDate = date != null ? LocalDate.parse(date) : LocalDate.now();
        byte[] excelBytes = excelService.exportDailyAttendanceExcel(targetDate);

        String filename = "so_diem_danh_" + targetDate.toString() + ".xlsx";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename)
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(excelBytes);
    }
}
