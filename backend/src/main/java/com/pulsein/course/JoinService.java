package com.pulsein.course;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.pulsein.attendance.CheckInRateLimiter;
import com.pulsein.auth.AuthUser;
import com.pulsein.auth.JwtProvider;
import com.pulsein.common.ApiException;
import com.pulsein.token.TokenService;
import java.time.Duration;
import java.time.Instant;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class JoinService {

    private static final Duration MAX_OPEN = Duration.ofMinutes(30);

    private final CourseRepository courses;
    private final EnrollmentRepository enrollments;
    private final CourseService courseService;
    private final TokenService tokenService;
    private final JwtProvider jwtProvider;
    private final CheckInRateLimiter rateLimiter;

    public JoinService(CourseRepository courses, EnrollmentRepository enrollments, CourseService courseService,
                       TokenService tokenService, JwtProvider jwtProvider, CheckInRateLimiter rateLimiter) {
        this.courses = courses;
        this.enrollments = enrollments;
        this.courseService = courseService;
        this.tokenService = tokenService;
        this.jwtProvider = jwtProvider;
        this.rateLimiter = rateLimiter;
    }

    public enum PreviewCode {
        OK,
        ALREADY_ENROLLED,
        INVALID_TOKEN
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record JoinPreview(String code, String ticket, CourseDto course) {

        static JoinPreview invalid() {
            return new JoinPreview(PreviewCode.INVALID_TOKEN.name(), null, null);
        }
    }

    @Transactional
    public CourseDto open(Long courseId, AuthUser user) {
        Course course = courseService.getOwnedCourse(courseId, user);
        if (!course.isJoinOpen()) {
            course.openJoin(tokenService.newSecret());
        }
        return courseService.toDto(course);
    }

    @Transactional
    public CourseDto close(Long courseId, AuthUser user) {
        Course course = courseService.getOwnedCourse(courseId, user);
        course.closeJoin();
        return courseService.toDto(course);
    }

    @Transactional
    public void closeStale() {
        Instant limit = Instant.now().minus(MAX_OPEN);
        for (Course course : courses.findByJoinOpenTrue()) {
            if (course.getJoinOpenedAt() == null || course.getJoinOpenedAt().isBefore(limit)) {
                course.closeJoin();
            }
        }
    }

    public JoinPreview preview(Long userId, String token) {
        if (!rateLimiter.tryAcquire(userId)) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "잠시 후 다시 시도해주세요");
        }
        if (!TokenService.isWellFormed(token)) {
            return JoinPreview.invalid();
        }
        long now = System.currentTimeMillis();
        for (Course course : courses.findByJoinOpenTrue()) {
            if (!course.isJoinOpen()) {
                continue;
            }
            if (tokenService.matchesRecent(course.getJoinSecret(), tokenService.defaultSlotSeconds(), token, now)) {
                CourseDto dto = courseService.toDto(course);
                if (enrollments.existsByCourseIdAndUserId(course.getId(), userId)) {
                    return new JoinPreview(PreviewCode.ALREADY_ENROLLED.name(), null, dto);
                }
                return new JoinPreview(PreviewCode.OK.name(), jwtProvider.issueJoinTicket(userId, course.getId()),
                        dto);
            }
        }
        return JoinPreview.invalid();
    }

    public CourseDto join(Long userId, String ticket) {
        Long courseId = jwtProvider.parseJoinTicket(ticket, userId)
                .orElseThrow(() -> ApiException.badRequest("참여 시간이 지났어요. 신호를 다시 들어주세요"));
        Course course = courses.findById(courseId).orElseThrow(() -> ApiException.notFound("강의를 찾을 수 없어요"));
        if (!enrollments.existsByCourseIdAndUserId(courseId, userId)) {
            try {
                enrollments.saveAndFlush(new Enrollment(courseId, userId));
            } catch (DataIntegrityViolationException ignored) {
            }
        }
        return courseService.toDto(course);
    }
}
