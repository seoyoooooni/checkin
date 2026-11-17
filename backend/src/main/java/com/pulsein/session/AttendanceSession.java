package com.pulsein.session;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Duration;
import java.time.Instant;

@Entity
@Table(name = "attendance_sessions")
public class AttendanceSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "course_id", nullable = false)
    private Long courseId;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "ended_at")
    private Instant endedAt;

    @Column(name = "late_after_min", nullable = false)
    private int lateAfterMin;

    @Column(name = "slot_seconds", nullable = false)
    private int slotSeconds;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SessionStatus status;

    @Column(nullable = false)
    private byte[] secret;

    protected AttendanceSession() {
    }

    public AttendanceSession(Long courseId, int lateAfterMin, int slotSeconds, byte[] secret) {
        this.courseId = courseId;
        this.lateAfterMin = lateAfterMin;
        this.slotSeconds = slotSeconds;
        this.secret = secret;
        this.startedAt = Instant.now();
        this.status = SessionStatus.OPEN;
    }

    public void close() {
        if (status == SessionStatus.OPEN) {
            status = SessionStatus.CLOSED;
            endedAt = Instant.now();
        }
    }

    public boolean isOpen() {
        return status == SessionStatus.OPEN;
    }

    public boolean isLateAt(Instant time) {
        return Duration.between(startedAt, time).compareTo(Duration.ofMinutes(lateAfterMin)) > 0;
    }

    public Long getId() {
        return id;
    }

    public Long getCourseId() {
        return courseId;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public Instant getEndedAt() {
        return endedAt;
    }

    public int getLateAfterMin() {
        return lateAfterMin;
    }

    public int getSlotSeconds() {
        return slotSeconds;
    }

    public SessionStatus getStatus() {
        return status;
    }

    public byte[] getSecret() {
        return secret;
    }
}
