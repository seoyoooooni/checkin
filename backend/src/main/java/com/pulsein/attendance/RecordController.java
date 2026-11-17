package com.pulsein.attendance;

import com.pulsein.auth.AuthUser;
import com.pulsein.common.ApiException;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class RecordController {

    private final RecordService recordService;

    public RecordController(RecordService recordService) {
        this.recordService = recordService;
    }

    public record MarkRequest(String status) {
    }

    @GetMapping("/api/sessions/{sessionId}/records")
    public List<RecordDto> roster(@PathVariable Long sessionId, @AuthenticationPrincipal AuthUser user) {
        return recordService.roster(sessionId, user);
    }

    @PutMapping("/api/sessions/{sessionId}/records/{userId}")
    public ResponseEntity<Void> mark(@PathVariable Long sessionId, @PathVariable Long userId,
                                     @RequestBody MarkRequest request, @AuthenticationPrincipal AuthUser user) {
        AttendanceStatus status;
        try {
            status = AttendanceStatus.valueOf(String.valueOf(request.status()));
        } catch (IllegalArgumentException e) {
            throw ApiException.badRequest("출석 상태가 올바르지 않아요");
        }
        recordService.mark(sessionId, userId, status, user);
        return ResponseEntity.noContent().build();
    }
}
