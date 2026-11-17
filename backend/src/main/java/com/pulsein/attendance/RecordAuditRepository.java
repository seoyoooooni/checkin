package com.pulsein.attendance;

import org.springframework.data.jpa.repository.JpaRepository;

public interface RecordAuditRepository extends JpaRepository<RecordAudit, Long> {
}
