package com.pulsein.course;

import com.pulsein.auth.AuthUser;
import com.pulsein.common.ApiException;
import com.pulsein.user.User;
import com.pulsein.user.UserRepository;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class CourseService {

    private final CourseRepository courses;
    private final EnrollmentRepository enrollments;
    private final UserRepository users;

    public CourseService(CourseRepository courses, EnrollmentRepository enrollments, UserRepository users) {
        this.courses = courses;
        this.enrollments = enrollments;
        this.users = users;
    }

    public List<CourseDto> myCourses(AuthUser user) {
        List<Course> list = user.isProfessor()
                ? courses.findByProfessorIdOrderByNameAsc(user.id())
                : courses.findEnrolledCourses(user.id());
        Map<Long, String> professorNames = users
                .findAllById(list.stream().map(Course::getProfessorId).distinct().toList())
                .stream()
                .collect(Collectors.toMap(User::getId, User::getName));
        return list.stream()
                .map(c -> CourseDto.of(c, professorNames.getOrDefault(c.getProfessorId(), ""),
                        enrollments.countByCourseId(c.getId())))
                .toList();
    }

    public CourseDto toDto(Course course) {
        String professorName = users.findById(course.getProfessorId()).map(User::getName).orElse("");
        return CourseDto.of(course, professorName, enrollments.countByCourseId(course.getId()));
    }

    public Course getOwnedCourse(Long courseId, AuthUser user) {
        Course course = courses.findById(courseId).orElseThrow(() -> ApiException.notFound("강의를 찾을 수 없어요"));
        if (!course.getProfessorId().equals(user.id())) {
            throw ApiException.forbidden();
        }
        return course;
    }

    public boolean isProfessorOf(Long courseId, Long professorId) {
        return courses.findById(courseId).map(c -> c.getProfessorId().equals(professorId)).orElse(false);
    }

    public Map<Long, Course> findAllById(List<Long> ids) {
        return courses.findAllById(ids).stream().collect(Collectors.toMap(Course::getId, Function.identity()));
    }
}
