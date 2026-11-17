package com.pulsein.course;

public record CourseDto(
        String id,
        String name,
        String section,
        String semester,
        String professorName,
        String room,
        String schedule,
        long studentCount,
        boolean joinOpen) {

    public static CourseDto of(Course c, String professorName, long studentCount) {
        return new CourseDto(String.valueOf(c.getId()), c.getName(), c.getSection(), c.getSemester(), professorName,
                c.getRoom(), c.getSchedule(), studentCount, c.isJoinOpen());
    }
}
