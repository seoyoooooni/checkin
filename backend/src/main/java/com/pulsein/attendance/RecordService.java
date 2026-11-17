package com.pulsein.attendance;

import com.pulsein.auth.AuthUser;
import com.pulsein.common.ApiException;
import com.pulsein.course.EnrollmentRepository;
import com.pulsein.session.AttendanceSession;
import com.pulsein.session.SessionService;
import com.pulsein.user.User;
import com.pulsein.user.UserRepository;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RecordService {

    private final SessionService sessionService;
    private final EnrollmentRepository enrollments;
    private final UserRepository users;
    private final AttendanceRecordRepository records;
    private final RecordAuditRepository audits;

    public RecordService(SessionService sessionService, EnrollmentRepository enrollments, UserRepository users,
                         AttendanceRecordRepository records, RecordAuditRepository audits) {
        this.sessionService = sessionService;
        this.enrollments = enrollments;
        this.users = users;
        this.records = records;
        this.audits = audits;
    }

    @Transactional(readOnly = true)
    public List<RecordDto> roster(Long sessionId, AuthUser user) {
        AttendanceSession session = sessionService.getOwnedSession(sessionId, user);
        List<User> students = users.findAllById(enrollments.findUserIdsByCourseId(session.getCourseId()));
        Map<Long, AttendanceRecord> byUser = records.findBySessionId(sessionId).stream()
                .collect(Collectors.toMap(AttendanceRecord::getUserId, Function.identity()));
        return students.stream()
                .sorted(Comparator.comparing(User::getNumber))
                .map(s -> {
                    AttendanceRecord r = byUser.get(s.getId());
                    return new RecordDto(
                            String.valueOf(s.getId()),
                            s.getNumber(),
                            s.getName(),
                            r == null ? AttendanceStatus.ABSENT.name() : r.getStatus().name(),
                            r == null ? null : r.getSubmittedAt(),
                            r != null && r.isManual());
                })
                .toList();
    }

    @Transactional
    public void mark(Long sessionId, Long studentId, AttendanceStatus status, AuthUser user) {
        AttendanceSession session = sessionService.getOwnedSession(sessionId, user);
        if (status == AttendanceStatus.SUSPICIOUS) {
            throw ApiException.badRequest("출석, 지각, 미출석 중에서 골라주세요");
        }
        if (!enrollments.existsByCourseIdAndUserId(session.getCourseId(), studentId)) {
            throw ApiException.notFound("이 강의의 수강생이 아니에요");
        }
        AttendanceRecord record = records.findBySessionIdAndUserId(sessionId, studentId).orElse(null);
        AttendanceStatus before = record == null ? null : record.getStatus();
        if (record == null) {
            record = AttendanceRecord.manual(sessionId, studentId, status);
        } else {
            record.applyManual(status);
        }
        record = records.save(record);
        audits.save(new RecordAudit(record.getId(), before, status, user.id(), null));
    }
}
