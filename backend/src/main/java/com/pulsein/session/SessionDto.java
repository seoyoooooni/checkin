package com.pulsein.session;

import java.time.Instant;

public record SessionDto(
        String id,
        String courseId,
        Instant startedAt,
        Instant endedAt,
        int lateAfterMin,
        int slotSeconds,
        String status) {

    public static SessionDto from(AttendanceSession s) {
        return new SessionDto(String.valueOf(s.getId()), String.valueOf(s.getCourseId()), s.getStartedAt(),
                s.getEndedAt(), s.getLateAfterMin(), s.getSlotSeconds(), s.getStatus().name());
    }
}
