package com.pulsein.course;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CourseRepository extends JpaRepository<Course, Long> {

    List<Course> findByProfessorIdOrderByNameAsc(Long professorId);

    @Query("select c from Course c where c.id in (select e.courseId from Enrollment e where e.userId = :userId) order by c.name")
    List<Course> findEnrolledCourses(@Param("userId") Long userId);
}
