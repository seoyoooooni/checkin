package com.pulsein.auth;

import com.pulsein.common.ApiException;
import com.pulsein.user.Role;
import com.pulsein.user.User;
import com.pulsein.user.UserNumbers;
import com.pulsein.user.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final int MIN_PASSWORD = 8;
    private static final int MAX_PASSWORD = 72;
    private static final int MAX_NAME = 50;

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

    public record SignupRequest(String number, String name, String password) {
    }

    public record LoginResponse(String accessToken, UserDto user) {
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        User user = users.findByNumber(UserNumbers.normalize(request.number()))
                .filter(u -> passwordEncoder.matches(request.password(), u.getPasswordHash()))
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "학번 또는 비밀번호가 맞지 않아요"));
        return new LoginResponse(jwtProvider.issue(user), UserDto.from(user));
    }

    @PostMapping("/signup")
    public LoginResponse signup(@RequestBody SignupRequest request) {
        String number = UserNumbers.normalize(request.number());
        Role role = UserNumbers.roleOf(number)
                .orElseThrow(() -> ApiException.badRequest("아이디는 숫자로 된 학번이나 P로 시작하는 교번이어야 해요"));
        String name = request.name() == null ? "" : request.name().trim();
        if (name.isEmpty() || name.length() > MAX_NAME) {
            throw ApiException.badRequest("이름을 입력해주세요");
        }
        String password = request.password() == null ? "" : request.password();
        if (password.length() < MIN_PASSWORD || password.length() > MAX_PASSWORD) {
            throw ApiException.badRequest("비밀번호는 8자 이상으로 정해주세요");
        }
        if (users.findByNumber(number).isPresent()) {
            throw ApiException.conflict("이미 가입된 아이디예요");
        }
        User user;
        try {
            user = users.saveAndFlush(new User(number, name, role, passwordEncoder.encode(password)));
        } catch (DataIntegrityViolationException e) {
            throw ApiException.conflict("이미 가입된 아이디예요");
        }
        return new LoginResponse(jwtProvider.issue(user), UserDto.from(user));
    }
}
