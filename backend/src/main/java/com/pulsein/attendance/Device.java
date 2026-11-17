package com.pulsein.attendance;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "devices")
public class Device {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    @Column(name = "device_hash", nullable = false)
    private String deviceHash;

    @Column(nullable = false)
    private String status;

    @Column(name = "registered_at", nullable = false)
    private Instant registeredAt;

    protected Device() {
    }

    public Device(Long userId, String deviceHash) {
        this.userId = userId;
        this.deviceHash = deviceHash;
        this.status = "ACTIVE";
        this.registeredAt = Instant.now();
    }

    public boolean matches(String hash) {
        return deviceHash.equals(hash);
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }
}
