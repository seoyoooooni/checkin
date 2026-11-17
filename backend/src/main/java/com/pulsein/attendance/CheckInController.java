package com.pulsein.attendance;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.pulsein.auth.AuthUser;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class CheckInController {

    private final CheckInService checkInService;

    public CheckInController(CheckInService checkInService) {
        this.checkInService = checkInService;
    }

    public record CheckInRequest(String token, String deviceId) {
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record CheckInResponse(String code, String courseName, Instant submittedAt) {
    }

    @PostMapping("/api/check-in")
    public CheckInResponse checkIn(@RequestBody CheckInRequest request, @AuthenticationPrincipal AuthUser user,
                                   HttpServletRequest http) {
        CheckInService.Result result = checkInService.checkIn(user.id(), request.token(), request.deviceId(),
                http.getRemoteAddr());
        return new CheckInResponse(result.code().name(), result.courseName(), result.submittedAt());
    }
}
