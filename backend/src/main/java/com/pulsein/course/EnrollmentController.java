package com.pulsein.course;

import com.pulsein.auth.AuthUser;
import com.pulsein.course.JoinService.JoinPreview;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class EnrollmentController {

    private final JoinService joinService;

    public EnrollmentController(JoinService joinService) {
        this.joinService = joinService;
    }

    public record PreviewRequest(String token) {
    }

    public record JoinRequest(String ticket) {
    }

    @PostMapping("/api/enrollments/preview")
    public JoinPreview preview(@RequestBody PreviewRequest request, @AuthenticationPrincipal AuthUser user) {
        return joinService.preview(user.id(), request.token());
    }

    @PostMapping("/api/enrollments")
    public CourseDto join(@RequestBody JoinRequest request, @AuthenticationPrincipal AuthUser user) {
        return joinService.join(user.id(), request.ticket());
    }
}
