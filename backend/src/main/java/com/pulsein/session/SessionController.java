package com.pulsein.session;

import com.pulsein.auth.AuthUser;
import com.pulsein.common.ApiException;
import com.pulsein.course.CourseDto;
import com.pulsein.course.CourseService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SessionController {

    private final SessionService sessionService;
    private final CourseService courseService;

    public SessionController(SessionService sessionService, CourseService courseService) {
        this.sessionService = sessionService;
        this.courseService = courseService;
    }

    public record StartRequest(@NotNull Integer lateAfterMin) {
    }

    public record UpdateRequest(String status) {
    }

    public record SessionDetail(SessionDto session, CourseDto course) {
    }

    @GetMapping("/api/courses/{courseId}/sessions/active")
    public ResponseEntity<SessionDto> active(@PathVariable Long courseId, @AuthenticationPrincipal AuthUser user) {
        return sessionService.activeSession(courseId, user)
                .map(s -> ResponseEntity.ok(SessionDto.from(s)))
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PostMapping("/api/courses/{courseId}/sessions")
    public SessionDto start(@PathVariable Long courseId, @Valid @RequestBody StartRequest request,
                            @AuthenticationPrincipal AuthUser user) {
        return SessionDto.from(sessionService.start(courseId, request.lateAfterMin(), user));
    }

    @PatchMapping("/api/sessions/{sessionId}")
    public SessionDto update(@PathVariable Long sessionId, @RequestBody UpdateRequest request,
                             @AuthenticationPrincipal AuthUser user) {
        if (!SessionStatus.CLOSED.name().equals(request.status())) {
            throw ApiException.badRequest("지금은 출석 종료만 할 수 있어요");
        }
        return SessionDto.from(sessionService.close(sessionId, user));
    }

    @GetMapping("/api/sessions/{sessionId}")
    public SessionDetail get(@PathVariable Long sessionId, @AuthenticationPrincipal AuthUser user) {
        AttendanceSession session = sessionService.getOwnedSession(sessionId, user);
        CourseDto course = courseService.toDto(courseService.getOwnedCourse(session.getCourseId(), user));
        return new SessionDetail(SessionDto.from(session), course);
    }
}
