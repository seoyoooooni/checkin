package com.pulsein.user;

import java.util.Locale;
import java.util.Optional;
import java.util.regex.Pattern;

public final class UserNumbers {

    private static final Pattern PROFESSOR = Pattern.compile("^P\\d{3,15}$");
    private static final Pattern STUDENT = Pattern.compile("^\\d{5,15}$");

    private UserNumbers() {
    }

    public static String normalize(String number) {
        return number == null ? "" : number.trim().toUpperCase(Locale.ROOT);
    }

    public static Optional<Role> roleOf(String normalized) {
        if (PROFESSOR.matcher(normalized).matches()) {
            return Optional.of(Role.PROFESSOR);
        }
        if (STUDENT.matcher(normalized).matches()) {
            return Optional.of(Role.STUDENT);
        }
        return Optional.empty();
    }
}
