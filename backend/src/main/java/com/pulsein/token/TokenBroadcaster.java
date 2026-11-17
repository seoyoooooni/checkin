package com.pulsein.token;

import com.pulsein.session.AttendanceSession;
import com.pulsein.session.SessionRepository;
import com.pulsein.session.SessionStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class TokenBroadcaster {

    private final SessionRepository sessions;
    private final TokenService tokenService;
    private final SimpMessagingTemplate messaging;

    public TokenBroadcaster(SessionRepository sessions, TokenService tokenService, SimpMessagingTemplate messaging) {
        this.sessions = sessions;
        this.tokenService = tokenService;
        this.messaging = messaging;
    }

    public static String destination(Long sessionId) {
        return "/topic/sessions/" + sessionId + "/token";
    }

    @Scheduled(fixedRate = 500)
    public void broadcast() {
        long now = System.currentTimeMillis();
        for (AttendanceSession session : sessions.findByStatus(SessionStatus.OPEN)) {
            messaging.convertAndSend(destination(session.getId()), tokenService.tick(session, now));
        }
    }
}
