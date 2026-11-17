package com.pulsein.course;

import com.pulsein.auth.AuthUser;
import com.pulsein.common.ApiException;
import com.pulsein.user.Role;
import com.pulsein.user.User;
import com.pulsein.user.UserNumbers;
import com.pulsein.user.UserRepository;
import java.util.Comparator;
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

    public record CourseInput(String name, String section, String semester, String room, String schedule) {
    }

    public record StudentDto(String userId, String number, String name) {

        static StudentDto from(User u) {
            return new StudentDto(String.valueOf(u.getId()), u.getNumber(), u.getName());
        }
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

    @Transactional
    public CourseDto create(CourseInput input, AuthUser user) {
        String name = required(input.name(), 100, "과목명을 입력해주세요");
        String section = required(input.section(), 10, "분반을 입력해주세요");
        String semester = required(input.semester(), 10, "학기를 입력해주세요");
        String room = optional(input.room(), 50);
        String schedule = optional(input.schedule(), 50);
        Course course = courses.save(new Course(name, section, semester, user.id(), room, schedule));
        return toDto(course);
    }

    public CourseDto get(Long courseId, AuthUser user) {
        return toDto(getOwnedCourse(courseId, user));
    }

    public List<StudentDto> students(Long courseId, AuthUser user) {
        getOwnedCourse(courseId, user);
        return users.findAllById(enrollments.findUserIdsByCourseId(courseId)).stream()
                .sorted(Comparator.comparing(User::getNumber))
                .map(StudentDto::from)
                .toList();
    }

    @Transactional
    public StudentDto addStudent(Long courseId, String number, AuthUser user) {
        getOwnedCourse(courseId, user);
        User student = users.findByNumber(UserNumbers.normalize(number))
                .filter(u -> u.getRole() == Role.STUDENT)
                .orElseThrow(() -> ApiException.notFound("가입하지 않은 학번이에요"));
        if (enrollments.existsByCourseIdAndUserId(courseId, student.getId())) {
            throw ApiException.conflict("이미 수강 중인 학생이에요");
        }
        enrollments.save(new Enrollment(courseId, student.getId()));
        return StudentDto.from(student);
    }

    @Transactional
    public void removeStudent(Long courseId, Long studentId, AuthUser user) {
        getOwnedCourse(courseId, user);
        enrollments.deleteByCourseIdAndUserId(courseId, studentId);
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

    private static String required(String value, int max, String message) {
        String v = value == null ? "" : value.trim();
        if (v.isEmpty()) {
            throw ApiException.badRequest(message);
        }
        if (v.length() > max) {
            throw ApiException.badRequest(max + "자 이내로 입력해주세요");
        }
        return v;
    }

    private static String optional(String value, int max) {
        String v = value == null ? "" : value.trim();
        if (v.length() > max) {
            throw ApiException.badRequest(max + "자 이내로 입력해주세요");
        }
        return v;
    }
}
