package com.pulsein.course;

import com.pulsein.auth.AuthUser;
import com.pulsein.course.CourseService.CourseInput;
import com.pulsein.course.CourseService.StudentDto;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class CourseController {

    private final CourseService courseService;
    private final JoinService joinService;

    public CourseController(CourseService courseService, JoinService joinService) {
        this.courseService = courseService;
        this.joinService = joinService;
    }

    public record AddStudentRequest(String number) {
    }

    @GetMapping("/api/me/courses")
    public List<CourseDto> myCourses(@AuthenticationPrincipal AuthUser user) {
        return courseService.myCourses(user);
    }

    @PostMapping("/api/courses")
    public CourseDto create(@RequestBody CourseInput input, @AuthenticationPrincipal AuthUser user) {
        return courseService.create(input, user);
    }

    @GetMapping("/api/courses/{courseId}")
    public CourseDto get(@PathVariable Long courseId, @AuthenticationPrincipal AuthUser user) {
        return courseService.get(courseId, user);
    }

    @PostMapping("/api/courses/{courseId}/join/open")
    public CourseDto openJoin(@PathVariable Long courseId, @AuthenticationPrincipal AuthUser user) {
        return joinService.open(courseId, user);
    }

    @PostMapping("/api/courses/{courseId}/join/close")
    public CourseDto closeJoin(@PathVariable Long courseId, @AuthenticationPrincipal AuthUser user) {
        return joinService.close(courseId, user);
    }

    @GetMapping("/api/courses/{courseId}/students")
    public List<StudentDto> students(@PathVariable Long courseId, @AuthenticationPrincipal AuthUser user) {
        return courseService.students(courseId, user);
    }

    @PostMapping("/api/courses/{courseId}/students")
    public StudentDto addStudent(@PathVariable Long courseId, @RequestBody AddStudentRequest request,
                                 @AuthenticationPrincipal AuthUser user) {
        return courseService.addStudent(courseId, request.number(), user);
    }

    @DeleteMapping("/api/courses/{courseId}/students/{userId}")
    public ResponseEntity<Void> removeStudent(@PathVariable Long courseId, @PathVariable Long userId,
                                              @AuthenticationPrincipal AuthUser user) {
        courseService.removeStudent(courseId, userId, user);
        return ResponseEntity.noContent().build();
    }
}
