package com.pulsein.session;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SessionRepository extends JpaRepository<AttendanceSession, Long> {

    Optional<AttendanceSession> findFirstByCourseIdAndStatus(Long courseId, SessionStatus status);

    List<AttendanceSession> findByStatus(SessionStatus status);

    List<AttendanceSession> findByStatusAndCourseIdIn(SessionStatus status, Collection<Long> courseIds);

    List<AttendanceSession> findByStatusAndCourseIdInAndEndedAtAfter(
            SessionStatus status, Collection<Long> courseIds, Instant endedAfter);
}
