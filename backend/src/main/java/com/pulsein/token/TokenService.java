package com.pulsein.token;

import com.pulsein.session.AttendanceSession;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class TokenService {

    public static final int CODE_LENGTH = 6;
    private static final int MODULO = 1_000_000;
    private static final int SECRET_BYTES = 32;
    private static final String ALGORITHM = "HmacSHA256";

    private final int defaultSlotSeconds;
    private final SecureRandom random = new SecureRandom();

    public TokenService(@Value("${app.attendance.slot-seconds}") int defaultSlotSeconds) {
        this.defaultSlotSeconds = defaultSlotSeconds;
    }

    public record TokenTick(String token, long slot, long expiresAt) {
    }

    public byte[] newSecret() {
        byte[] secret = new byte[SECRET_BYTES];
        random.nextBytes(secret);
        return secret;
    }

    public int defaultSlotSeconds() {
        return defaultSlotSeconds;
    }

    public long slotOf(int slotSeconds, long epochMillis) {
        return epochMillis / (slotSeconds * 1000L);
    }

    public TokenTick tick(byte[] secret, int slotSeconds, long epochMillis) {
        long slot = slotOf(slotSeconds, epochMillis);
        return new TokenTick(code(secret, slot), slot, (slot + 1) * slotSeconds * 1000L);
    }

    public boolean matches(byte[] secret, String token, long slot) {
        byte[] expected = code(secret, slot).getBytes(StandardCharsets.US_ASCII);
        return MessageDigest.isEqual(expected, token.getBytes(StandardCharsets.US_ASCII));
    }

    public boolean matchesRecent(byte[] secret, int slotSeconds, String token, long epochMillis) {
        long current = slotOf(slotSeconds, epochMillis);
        return matches(secret, token, current) || matches(secret, token, current - 1);
    }

    public long slotOf(AttendanceSession session, long epochMillis) {
        return slotOf(session.getSlotSeconds(), epochMillis);
    }

    public TokenTick tick(AttendanceSession session, long epochMillis) {
        return tick(session.getSecret(), session.getSlotSeconds(), epochMillis);
    }

    public boolean matches(AttendanceSession session, String token, long slot) {
        return matches(session.getSecret(), token, slot);
    }

    public static boolean isWellFormed(String token) {
        return token != null && token.length() == CODE_LENGTH && token.chars().allMatch(Character::isDigit);
    }

    String code(byte[] secret, long slot) {
        try {
            Mac mac = Mac.getInstance(ALGORITHM);
            mac.init(new SecretKeySpec(secret, ALGORITHM));
            byte[] h = mac.doFinal(ByteBuffer.allocate(Long.BYTES).putLong(slot).array());
            int offset = h[h.length - 1] & 0x0f;
            int binary = ((h[offset] & 0x7f) << 24)
                    | ((h[offset + 1] & 0xff) << 16)
                    | ((h[offset + 2] & 0xff) << 8)
                    | (h[offset + 3] & 0xff);
            return String.format("%0" + CODE_LENGTH + "d", binary % MODULO);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException(e);
        }
    }
}
