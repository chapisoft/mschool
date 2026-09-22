package vn.microtec.mschool.domain.attendance;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;
import vn.microtec.mschool.domain.enums.AttendanceStatus;
import vn.microtec.mschool.domain.enums.Direction;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Daily Session State Machine for Gate Attendance.
 * Sử dụng 100% Enums thống nhất toàn hệ thống.
 */
@Getter
@Setter
@Builder
@ToString
public class DailySessionStateMachine {

    private UUID id;
    private String identityCode;
    private LocalDate sessionDate;
    private LocalDateTime checkInTime;
    private LocalDateTime checkOutTime;
    private LocalDateTime lastOutTime;
    private AttendanceStatus status;
    private int totalPresentMinutes;

    public static DailySessionStateMachine init(String identityCode, LocalDate date) {
        return DailySessionStateMachine.builder()
                .id(UUID.randomUUID())
                .identityCode(identityCode)
                .sessionDate(date)
                .status(AttendanceStatus.ABSENT)
                .totalPresentMinutes(0)
                .build();
    }

    /**
     * Thực thi chuyển đổi trạng thái phiên dựa vào sự kiện quét và thời gian.
     */
    public boolean processTransition(Direction direction, LocalDateTime scanTime) {
        boolean shouldNotify = false;

        if (direction == Direction.IN) {
            if (this.checkInTime == null) {
                this.checkInTime = scanTime;
                LocalDateTime lateCutoff = this.sessionDate.atTime(7, 30);
                if (scanTime.isAfter(lateCutoff)) {
                    this.status = AttendanceStatus.LATE;
                } else {
                    this.status = AttendanceStatus.PRESENT;
                }
                shouldNotify = true;
            } else if (this.lastOutTime != null) {
                Duration away = Duration.between(this.lastOutTime, scanTime);
                if (away.toMinutes() > 5) {
                    this.totalPresentMinutes += (int) away.toMinutes();
                }
                this.lastOutTime = null;
            }
        } else if (direction == Direction.OUT) {
            if (this.checkInTime != null) {
                this.lastOutTime = scanTime;
                LocalDateTime departureThreshold = this.sessionDate.atTime(16, 0);
                if (scanTime.isAfter(departureThreshold)) {
                    this.checkOutTime = scanTime;
                    if (this.status != AttendanceStatus.LATE) {
                        this.status = AttendanceStatus.PRESENT;
                    }
                    shouldNotify = true;
                } else {
                    this.status = AttendanceStatus.EARLY_LEAVE;
                    shouldNotify = true;
                }
            }
        }

        return shouldNotify;
    }
}
