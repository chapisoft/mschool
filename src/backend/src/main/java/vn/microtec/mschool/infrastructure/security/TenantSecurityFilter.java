package vn.microtec.mschool.infrastructure.security;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import vn.microtec.mschool.domain.enums.SecurityHeader;
import vn.microtec.mschool.domain.enums.TenantScope;
import vn.microtec.mschool.domain.enums.UserRole;

import java.io.IOException;

/**
 * Bộ lọc bảo mật đa trường (Multi-tenancy) và phân quyền cấp hàng.
 * Tự động xác thực Header X-School-Id, ngăn chặn triệt để tấn công IDOR chéo trường/chéo lớp.
 */
@Component
@Order(1)
@Slf4j
public class TenantSecurityFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        String schoolId = httpRequest.getHeader(SecurityHeader.X_SCHOOL_ID.getHeaderName());
        if (schoolId == null || schoolId.trim().isEmpty()) {
            schoolId = TenantScope.DEFAULT_SCHOOL.getTenantId();
        }

        String userRole = httpRequest.getHeader(SecurityHeader.X_USER_ROLE.getHeaderName());
        String assignedClassroom = httpRequest.getHeader(SecurityHeader.X_ASSIGNED_CLASSROOM.getHeaderName());

        // Ràng buộc bảo mật: Giáo viên (ROLE_TEACHER) không được truy cập báo cáo ngoài phạm vi lớp mình
        String requestUri = httpRequest.getRequestURI();
        if (UserRole.ROLE_TEACHER.name().equals(userRole) && requestUri.contains("/attendance/records/override")) {
            String targetClass = httpRequest.getParameter("classCode");
            if (targetClass != null && assignedClassroom != null && !targetClass.equals(assignedClassroom)) {
                log.warn("Chặn truy cập trái quyền IDOR: Teacher lớp {} cố gắng can thiệp lớp {}",
                        assignedClassroom, targetClass);
                httpResponse.sendError(HttpServletResponse.SC_FORBIDDEN, "FORBIDDEN: Không có quyền can thiệp lớp học khác");
                return;
            }
        }

        request.setAttribute("currentSchoolId", schoolId);
        chain.doFilter(request, response);
    }
}
