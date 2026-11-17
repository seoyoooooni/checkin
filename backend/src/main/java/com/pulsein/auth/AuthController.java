package com.pulsein.auth;

import com.pulsein.common.ApiException;
import com.pulsein.user.User;
import com.pulsein.user.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;

    public AuthController(UserRepository users, PasswordEncoder passwordEncoder, JwtProvider jwtProvider) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.jwtProvider = jwtProvider;
    }

    public record LoginRequest(@NotBlank String number, @NotBlank String password) {
    }

    public record LoginResponse(String accessToken, UserDto user) {
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        User user = users.findByNumber(request.number().trim())
                .filter(u -> passwordEncoder.matches(request.password(), u.getPasswordHash()))
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "학번 또는 비밀번호가 맞지 않아요"));
        return new LoginResponse(jwtProvider.issue(user), UserDto.from(user));
    }
}
