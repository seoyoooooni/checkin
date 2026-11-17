package com.pulsein.course;

import com.pulsein.auth.AuthUser;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class CourseController {

    private final CourseService courseService;

    public CourseController(CourseService courseService) {
        this.courseService = courseService;
    }

    @GetMapping("/api/me/courses")
    public List<CourseDto> myCourses(@AuthenticationPrincipal AuthUser user) {
        return courseService.myCourses(user);
    }
}
