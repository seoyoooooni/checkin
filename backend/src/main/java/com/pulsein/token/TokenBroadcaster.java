package com.pulsein.token;

import com.pulsein.course.Course;
import com.pulsein.course.CourseRepository;
import com.pulsein.course.JoinService;
import com.pulsein.session.AttendanceSession;
import com.pulsein.session.SessionRepository;
import com.pulsein.session.SessionStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class TokenBroadcaster {

    private final SessionRepository sessions;
    private final CourseRepository courses;
    private final JoinService joinService;
    private final TokenService tokenService;
    private final SimpMessagingTemplate messaging;

    public TokenBroadcaster(SessionRepository sessions, CourseRepository courses, JoinService joinService,
                            TokenService tokenService, SimpMessagingTemplate messaging) {
        this.sessions = sessions;
        this.courses = courses;
        this.joinService = joinService;
        this.tokenService = tokenService;
        this.messaging = messaging;
    }

    public static String destination(Long sessionId) {
        return "/topic/sessions/" + sessionId + "/token";
    }

    public static String joinDestination(Long courseId) {
        return "/topic/courses/" + courseId + "/join-token";
    }

    @Scheduled(fixedRate = 500)
    public void broadcast() {
        long now = System.currentTimeMillis();
        for (AttendanceSession session : sessions.findByStatus(SessionStatus.OPEN)) {
            messaging.convertAndSend(destination(session.getId()), tokenService.tick(session, now));
        }
        for (Course course : courses.findByJoinOpenTrue()) {
            if (course.isJoinOpen()) {
                messaging.convertAndSend(joinDestination(course.getId()),
                        tokenService.tick(course.getJoinSecret(), tokenService.defaultSlotSeconds(), now));
            }
        }
    }

    @Scheduled(fixedRate = 60_000)
    public void closeStaleJoins() {
        joinService.closeStale();
    }
}
