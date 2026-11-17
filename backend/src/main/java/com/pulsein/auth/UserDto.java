package com.pulsein.auth;

import com.pulsein.user.User;

public record UserDto(String id, String number, String name, String role) {

    public static UserDto from(User user) {
        return new UserDto(String.valueOf(user.getId()), user.getNumber(), user.getName(), user.getRole().name());
    }
}
