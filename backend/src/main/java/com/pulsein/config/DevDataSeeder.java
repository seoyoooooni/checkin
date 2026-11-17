package com.pulsein.config;

import com.pulsein.course.Course;
import com.pulsein.course.CourseRepository;
import com.pulsein.course.Enrollment;
import com.pulsein.course.EnrollmentRepository;
import com.pulsein.user.Role;
import com.pulsein.user.User;
import com.pulsein.user.UserRepository;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@ConditionalOnProperty(name = "app.seed.enabled", havingValue = "true")
public class DevDataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DevDataSeeder.class);
    private static final String DEFAULT_PASSWORD = "1234";

    private final UserRepository users;
    private final CourseRepository courses;
    private final EnrollmentRepository enrollments;
    private final PasswordEncoder passwordEncoder;

    public DevDataSeeder(UserRepository users, CourseRepository courses, EnrollmentRepository enrollments,
                         PasswordEncoder passwordEncoder) {
        this.users = users;
        this.courses = courses;
        this.enrollments = enrollments;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (users.count() > 0) {
            return;
        }
        String hash = passwordEncoder.encode(DEFAULT_PASSWORD);
        User professor = users.save(new User("P2026001", "닉네임", Role.PROFESSOR, hash));
        List<User> students = users.saveAll(List.of(
                new User("202600001", "홍길동", Role.STUDENT, hash),
                new User("202600002", "김민수", Role.STUDENT, hash),
                new User("202600003", "이서연", Role.STUDENT, hash),
                new User("202600004", "박지훈", Role.STUDENT, hash)));

        Course course = courses.save(new Course("웹프로그래밍", "A", "2026-2", professor.getId(), "공학관 405호",
                "월 10:00–12:50"));
        for (User s : students) {
            enrollments.save(new Enrollment(course.getId(), s.getId()));
        }
        log.info("개발용 데이터를 넣었어요. 교수 P2026001, 학생 202600001~202600004, 비밀번호 {}", DEFAULT_PASSWORD);
    }
}
