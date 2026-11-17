package com.pulsein.config;

import com.pulsein.auth.AuthUser;
import com.pulsein.auth.JwtProvider;
import com.pulsein.session.SessionService;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.context.annotation.Lazy;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

@Component
public class StompAuthInterceptor implements ChannelInterceptor {

    private static final Pattern TOKEN_TOPIC = Pattern.compile("^/topic/sessions/(\\d+)/token$");

    private final JwtProvider jwtProvider;
    private final SessionService sessionService;

    public StompAuthInterceptor(JwtProvider jwtProvider, @Lazy SessionService sessionService) {
        this.jwtProvider = jwtProvider;
        this.sessionService = sessionService;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) {
            return message;
        }
        if (accessor.getCommand() == StompCommand.CONNECT) {
            AuthUser user = jwtProvider.parseBearer(accessor.getFirstNativeHeader("Authorization"))
                    .orElseThrow(() -> new MessagingException("로그인이 필요해요"));
            accessor.setUser(user.toAuthentication());
        } else if (accessor.getCommand() == StompCommand.SUBSCRIBE) {
            checkSubscribe(accessor);
        } else if (accessor.getCommand() == StompCommand.SEND) {
            throw new MessagingException("보낼 수 없는 경로예요");
        }
        return message;
    }

    private void checkSubscribe(StompHeaderAccessor accessor) {
        AuthUser user = AuthUser.from(accessor.getUser());
        String destination = accessor.getDestination();
        Matcher m = destination == null ? null : TOKEN_TOPIC.matcher(destination);
        if (user == null || m == null || !m.matches()) {
            throw new MessagingException("구독할 수 없는 경로예요");
        }
        if (!user.isProfessor() || !sessionService.isOwner(Long.valueOf(m.group(1)), user.id())) {
            throw new MessagingException("권한이 없어요");
        }
    }
}
