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
@Table(name = "record_audits")
public class RecordAudit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "record_id", nullable = false)
    private Long recordId;

    @Enumerated(EnumType.STRING)
    @Column(name = "before_status")
    private AttendanceStatus beforeStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "after_status", nullable = false)
    private AttendanceStatus afterStatus;

    @Column(name = "changed_by", nullable = false)
    private Long changedBy;

    @Column
    private String reason;

    @Column(name = "changed_at", nullable = false)
    private Instant changedAt;

    protected RecordAudit() {
    }

    public RecordAudit(Long recordId, AttendanceStatus beforeStatus, AttendanceStatus afterStatus, Long changedBy,
                       String reason) {
        this.recordId = recordId;
        this.beforeStatus = beforeStatus;
        this.afterStatus = afterStatus;
        this.changedBy = changedBy;
        this.reason = reason;
        this.changedAt = Instant.now();
    }
}
