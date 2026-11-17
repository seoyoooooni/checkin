package com.pulsein.course;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EnrollmentRepository extends JpaRepository<Enrollment, Long> {

    long countByCourseId(Long courseId);

    boolean existsByCourseIdAndUserId(Long courseId, Long userId);

    @Query("select e.userId from Enrollment e where e.courseId = :courseId")
    List<Long> findUserIdsByCourseId(@Param("courseId") Long courseId);

    @Query("select e.courseId from Enrollment e where e.userId = :userId")
    List<Long> findCourseIdsByUserId(@Param("userId") Long userId);
}
