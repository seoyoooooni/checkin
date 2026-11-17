package com.pulsein.attendance;

public enum AttendanceStatus {
    PRESENT,
    LATE,
    ABSENT,
    SUSPICIOUS;

    public boolean isAttended() {
        return this == PRESENT || this == LATE;
    }
}
