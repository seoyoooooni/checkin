package com.pulsein.session;

import com.pulsein.auth.AuthUser;
import com.pulsein.common.ApiException;
import com.pulsein.course.CourseService;
import java.security.SecureRandom;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SessionService {

    private static final int SECRET_BYTES = 32;

    private final SessionRepository sessions;
    private final CourseService courseService;
    private final int slotSeconds;
    private final SecureRandom random = new SecureRandom();

    public SessionService(SessionRepository sessions, CourseService courseService,
                          @Value("${app.attendance.slot-seconds}") int slotSeconds) {
        this.sessions = sessions;
        this.courseService = courseService;
        this.slotSeconds = slotSeconds;
    }

    @Transactional(readOnly = true)
    public Optional<AttendanceSession> activeSession(Long courseId, AuthUser user) {
        courseService.getOwnedCourse(courseId, user);
        return sessions.findFirstByCourseIdAndStatus(courseId, SessionStatus.OPEN);
    }

    public AttendanceSession start(Long courseId, int lateAfterMin, AuthUser user) {
        courseService.getOwnedCourse(courseId, user);
        if (lateAfterMin < 0 || lateAfterMin > 180) {
            throw ApiException.badRequest("지각 기준은 0~180분 사이로 정해주세요");
        }
        if (sessions.findFirstByCourseIdAndStatus(courseId, SessionStatus.OPEN).isPresent()) {
            throw ApiException.conflict("이미 진행 중인 출석이 있어요");
        }
        byte[] secret = new byte[SECRET_BYTES];
        random.nextBytes(secret);
        try {
            return sessions.saveAndFlush(new AttendanceSession(courseId, lateAfterMin, slotSeconds, secret));
        } catch (DataIntegrityViolationException e) {
            throw ApiException.conflict("이미 진행 중인 출석이 있어요");
        }
    }

    @Transactional
    public AttendanceSession close(Long sessionId, AuthUser user) {
        AttendanceSession session = getOwnedSession(sessionId, user);
        session.close();
        return session;
    }

    @Transactional(readOnly = true)
    public AttendanceSession getOwnedSession(Long sessionId, AuthUser user) {
        AttendanceSession session = sessions.findById(sessionId)
                .orElseThrow(() -> ApiException.notFound("출석 세션을 찾을 수 없어요"));
        courseService.getOwnedCourse(session.getCourseId(), user);
        return session;
    }

    @Transactional(readOnly = true)
    public boolean isOwner(Long sessionId, Long professorId) {
        return sessions.findById(sessionId)
                .map(s -> courseService.isProfessorOf(s.getCourseId(), professorId))
                .orElse(false);
    }
}
