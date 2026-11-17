package com.pulsein.course;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "courses")
public class Course {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String section;

    @Column(nullable = false)
    private String semester;

    @Column(name = "professor_id", nullable = false)
    private Long professorId;

    @Column(nullable = false)
    private String room;

    @Column(nullable = false)
    private String schedule;

    @Column(name = "join_secret")
    private byte[] joinSecret;

    @Column(name = "join_open", nullable = false)
    private boolean joinOpen;

    @Column(name = "join_opened_at")
    private Instant joinOpenedAt;

    protected Course() {
    }

    public void openJoin(byte[] secret) {
        this.joinSecret = secret;
        this.joinOpen = true;
        this.joinOpenedAt = Instant.now();
    }

    public void closeJoin() {
        this.joinSecret = null;
        this.joinOpen = false;
        this.joinOpenedAt = null;
    }

    public boolean isJoinOpen() {
        return joinOpen && joinSecret != null;
    }

    public byte[] getJoinSecret() {
        return joinSecret;
    }

    public Instant getJoinOpenedAt() {
        return joinOpenedAt;
    }

    public Course(String name, String section, String semester, Long professorId, String room, String schedule) {
        this.name = name;
        this.section = section;
        this.semester = semester;
        this.professorId = professorId;
        this.room = room;
        this.schedule = schedule;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getSection() {
        return section;
    }

    public String getSemester() {
        return semester;
    }

    public Long getProfessorId() {
        return professorId;
    }

    public String getRoom() {
        return room;
    }

    public String getSchedule() {
        return schedule;
    }
}
