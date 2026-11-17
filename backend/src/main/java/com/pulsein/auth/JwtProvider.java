package com.pulsein.auth;

import com.pulsein.user.Role;
import com.pulsein.user.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class JwtProvider {

    private static final String TYPE = "typ";
    private static final String TYPE_JOIN = "join";
    private static final Duration JOIN_TICKET_TTL = Duration.ofMinutes(2);

    private final SecretKey key;
    private final Duration ttl;

    public JwtProvider(@Value("${app.jwt.secret}") String secret,
                       @Value("${app.jwt.expiration-hours}") long expirationHours) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.ttl = Duration.ofHours(expirationHours);
    }

    public String issue(User user) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(String.valueOf(user.getId()))
                .claim("role", user.getRole().name())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(ttl)))
                .signWith(key)
                .compact();
    }

    public Optional<AuthUser> parse(String token) {
        return claims(token).flatMap(claims -> {
            String role = claims.get("role", String.class);
            if (TYPE_JOIN.equals(claims.get(TYPE, String.class)) || role == null) {
                return Optional.empty();
            }
            return Optional.of(new AuthUser(Long.valueOf(claims.getSubject()), Role.valueOf(role)));
        });
    }

    public Optional<AuthUser> parseBearer(String header) {
        if (header == null || !header.startsWith("Bearer ")) {
            return Optional.empty();
        }
        return parse(header.substring(7));
    }

    public String issueJoinTicket(Long userId, Long courseId) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim(TYPE, TYPE_JOIN)
                .claim("courseId", String.valueOf(courseId))
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(JOIN_TICKET_TTL)))
                .signWith(key)
                .compact();
    }

    public Optional<Long> parseJoinTicket(String ticket, Long userId) {
        Optional<Claims> parsed = claims(ticket);
        if (parsed.isEmpty()) {
            return Optional.empty();
        }
        Claims c = parsed.get();
        if (!TYPE_JOIN.equals(c.get(TYPE, String.class)) || !String.valueOf(userId).equals(c.getSubject())) {
            return Optional.empty();
        }
        return toLong(c.get("courseId", String.class));
    }

    private static Optional<Long> toLong(String value) {
        if (value == null) {
            return Optional.empty();
        }
        try {
            return Optional.of(Long.valueOf(value));
        } catch (NumberFormatException e) {
            return Optional.empty();
        }
    }

    private Optional<Claims> claims(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        try {
            return Optional.of(Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload());
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
