package com.pulsein.attendance;

import java.time.Instant;

public record RecordDto(
        String userId,
        String studentNumber,
        String name,
        String status,
        Instant submittedAt,
        boolean manual) {
}
