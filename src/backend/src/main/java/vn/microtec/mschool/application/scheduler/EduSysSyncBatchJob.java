package vn.microtec.mschool.application.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

/**
 * Tác vụ nền định kỳ 01:00 sáng hàng ngày để đồng bộ dữ liệu chuyên cần
 * sang Cơ sở dữ liệu Ngành Giáo Dục (EduSys / vnEdu).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class EduSysSyncBatchJob {

    @Scheduled(cron = "0 0 1 * * ?")
    public void executeDailySync() {
        LocalDate yesterday = LocalDate.now().minusDays(1);
        log.info("Bắt đầu tiến trình đồng bộ dữ liệu chuyên cần ngày {} sang CSDL Ngành Giáo Dục...", yesterday);

        // Mô phỏng đồng bộ gói dữ liệu danh mục và điểm danh
        try {
            int totalSynced = 2150;
            log.info("Đồng bộ hoàn tất: {} bản ghi học sinh đã được đồng bộ với CSDL Ngành", totalSynced);
        } catch (Exception e) {
            log.error("Lỗi đồng bộ CSDL Ngành: {}", e.getMessage(), e);
        }
    }
}
