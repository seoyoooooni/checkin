package com.pulsein.course;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

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

    protected Course() {
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
