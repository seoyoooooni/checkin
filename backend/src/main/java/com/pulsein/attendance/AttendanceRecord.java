package com.pulsein.attendance;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "attendance_records")
public class AttendanceRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_id", nullable = false)
    private Long sessionId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "device_id")
    private Long deviceId;

    @Column(name = "submitted_at")
    private Instant submittedAt;

    @Column(name = "token_slot")
    private Long tokenSlot;

    @Column(name = "ip_hash")
    private String ipHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AttendanceStatus status;

    @Column(nullable = false)
    private boolean manual;

    @Column(name = "suspicion_score", nullable = false)
    private int suspicionScore;

    protected AttendanceRecord() {
    }

    public static AttendanceRecord checkedIn(Long sessionId, Long userId, Long deviceId, long tokenSlot,
                                             String ipHash, AttendanceStatus status, Instant submittedAt) {
        AttendanceRecord r = new AttendanceRecord();
        r.sessionId = sessionId;
        r.userId = userId;
        r.applyCheckIn(deviceId, tokenSlot, ipHash, status, submittedAt);
        return r;
    }

    public static AttendanceRecord manual(Long sessionId, Long userId, AttendanceStatus status) {
        AttendanceRecord r = new AttendanceRecord();
        r.sessionId = sessionId;
        r.userId = userId;
        r.applyManual(status);
        return r;
    }

    public void applyCheckIn(Long deviceId, long tokenSlot, String ipHash, AttendanceStatus status,
                             Instant submittedAt) {
        this.deviceId = deviceId;
        this.tokenSlot = tokenSlot;
        this.ipHash = ipHash;
        this.status = status;
        this.submittedAt = submittedAt;
        this.manual = false;
    }

    public void applyManual(AttendanceStatus status) {
        this.status = status;
        this.manual = true;
        if (status == AttendanceStatus.ABSENT) {
            this.submittedAt = null;
        } else if (this.submittedAt == null) {
            this.submittedAt = Instant.now();
        }
    }

    public Long getId() {
        return id;
    }

    public Long getSessionId() {
        return sessionId;
    }

    public Long getUserId() {
        return userId;
    }

    public Instant getSubmittedAt() {
        return submittedAt;
    }

    public AttendanceStatus getStatus() {
        return status;
    }

    public boolean isManual() {
        return manual;
    }
}
