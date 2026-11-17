package com.pulsein.attendance;

import com.pulsein.common.ApiException;
import com.pulsein.common.Hashing;
import com.pulsein.course.Course;
import com.pulsein.course.CourseRepository;
import com.pulsein.course.EnrollmentRepository;
import com.pulsein.session.AttendanceSession;
import com.pulsein.session.SessionRepository;
import com.pulsein.session.SessionStatus;
import com.pulsein.token.TokenService;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class CheckInService {

    private static final int EXPIRED_LOOKBACK_SLOTS = 12;
    private static final Duration CLOSED_LOOKBACK = Duration.ofMinutes(10);

    private final CheckInRateLimiter rateLimiter;
    private final DeviceRepository devices;
    private final EnrollmentRepository enrollments;
    private final SessionRepository sessions;
    private final CourseRepository courses;
    private final AttendanceRecordRepository records;
    private final TokenService tokenService;

    public CheckInService(CheckInRateLimiter rateLimiter, DeviceRepository devices,
                          EnrollmentRepository enrollments, SessionRepository sessions, CourseRepository courses,
                          AttendanceRecordRepository records, TokenService tokenService) {
        this.rateLimiter = rateLimiter;
        this.devices = devices;
        this.enrollments = enrollments;
        this.sessions = sessions;
        this.courses = courses;
        this.records = records;
        this.tokenService = tokenService;
    }

    public record Result(CheckInCode code, String courseName, Instant submittedAt) {

        static Result of(CheckInCode code) {
            return new Result(code, null, null);
        }
    }

    public Result checkIn(Long userId, String token, String deviceId, String ip) {
        if (!rateLimiter.tryAcquire(userId)) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "잠시 후 다시 시도해주세요");
        }
        if (deviceId == null || deviceId.isBlank()) {
            return Result.of(CheckInCode.UNREGISTERED_DEVICE);
        }
        Optional<Device> device = resolveDevice(userId, Hashing.sha256(deviceId));
        if (device.isEmpty()) {
            return Result.of(CheckInCode.UNREGISTERED_DEVICE);
        }
        if (!TokenService.isWellFormed(token)) {
            return Result.of(CheckInCode.INVALID_TOKEN);
        }

        long now = System.currentTimeMillis();
        List<Long> myCourseIds = enrollments.findCourseIdsByUserId(userId);
        List<AttendanceSession> myOpen = myCourseIds.isEmpty()
                ? List.of()
                : sessions.findByStatusAndCourseIdIn(SessionStatus.OPEN, myCourseIds);

        for (AttendanceSession session : myOpen) {
            long current = tokenService.slotOf(session, now);
            for (long slot = current; slot >= current - 1; slot--) {
                if (tokenService.matches(session, token, slot)) {
                    return record(session, userId, device.get().getId(), slot, ip);
                }
            }
        }
        for (AttendanceSession session : myOpen) {
            if (matchesAny(session, token, tokenService.slotOf(session, now) - 2, EXPIRED_LOOKBACK_SLOTS)) {
                return Result.of(CheckInCode.TOKEN_EXPIRED);
            }
        }
        if (matchesRecentlyClosed(myCourseIds, token)) {
            return Result.of(CheckInCode.SESSION_CLOSED);
        }
        if (matchesOtherOpen(Set.copyOf(myCourseIds), token, now)) {
            return Result.of(CheckInCode.NOT_ENROLLED);
        }
        return Result.of(CheckInCode.INVALID_TOKEN);
    }

    private Optional<Device> resolveDevice(Long userId, String hash) {
        Optional<Device> existing = devices.findByUserId(userId);
        if (existing.isPresent()) {
            return existing.filter(d -> d.matches(hash));
        }
        try {
            return Optional.of(devices.saveAndFlush(new Device(userId, hash)));
        } catch (DataIntegrityViolationException e) {
            return devices.findByUserId(userId).filter(d -> d.matches(hash));
        }
    }

    private Result record(AttendanceSession session, Long userId, Long deviceId, long slot, String ip) {
        Instant submittedAt = Instant.now();
        AttendanceStatus status = session.isLateAt(submittedAt) ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;
        String ipHash = ip == null ? null : Hashing.sha256(ip);
        String courseName = courses.findById(session.getCourseId()).map(Course::getName).orElse(null);

        Optional<AttendanceRecord> existing = records.findBySessionIdAndUserId(session.getId(), userId);
        if (existing.isPresent()) {
            AttendanceRecord r = existing.get();
            if (r.getStatus().isAttended()) {
                return new Result(CheckInCode.DUPLICATE, courseName, r.getSubmittedAt());
            }
            r.applyCheckIn(deviceId, slot, ipHash, status, submittedAt);
            records.save(r);
        } else {
            try {
                records.saveAndFlush(AttendanceRecord.checkedIn(session.getId(), userId, deviceId, slot, ipHash,
                        status, submittedAt));
            } catch (DataIntegrityViolationException e) {
                return new Result(CheckInCode.DUPLICATE, courseName, null);
            }
        }
        return new Result(CheckInCode.valueOf(status.name()), courseName, submittedAt);
    }

    private boolean matchesAny(AttendanceSession session, String token, long fromSlot, int count) {
        for (long slot = fromSlot; slot > fromSlot - count; slot--) {
            if (tokenService.matches(session, token, slot)) {
                return true;
            }
        }
        return false;
    }

    private boolean matchesRecentlyClosed(List<Long> myCourseIds, String token) {
        if (myCourseIds.isEmpty()) {
            return false;
        }
        Instant since = Instant.now().minus(CLOSED_LOOKBACK);
        for (AttendanceSession session : sessions.findByStatusAndCourseIdInAndEndedAtAfter(
                SessionStatus.CLOSED, myCourseIds, since)) {
            long lastSlot = tokenService.slotOf(session, session.getEndedAt().toEpochMilli());
            if (matchesAny(session, token, lastSlot, EXPIRED_LOOKBACK_SLOTS)) {
                return true;
            }
        }
        return false;
    }

    private boolean matchesOtherOpen(Set<Long> myCourseIds, String token, long now) {
        for (AttendanceSession session : sessions.findByStatus(SessionStatus.OPEN)) {
            if (myCourseIds.contains(session.getCourseId())) {
                continue;
            }
            long current = tokenService.slotOf(session, now);
            if (tokenService.matches(session, token, current) || tokenService.matches(session, token, current - 1)) {
                return true;
            }
        }
        return false;
    }
}
