package com.pulsein.auth;

import com.pulsein.user.Role;
import java.util.List;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

public record AuthUser(Long id, Role role) {

    public boolean isProfessor() {
        return role == Role.PROFESSOR;
    }

    public Authentication toAuthentication() {
        return new UsernamePasswordAuthenticationToken(this, null,
                List.of(new SimpleGrantedAuthority("ROLE_" + role.name())));
    }

    public static AuthUser from(Object principal) {
        if (principal instanceof Authentication auth && auth.getPrincipal() instanceof AuthUser user) {
            return user;
        }
        return null;
    }
}
