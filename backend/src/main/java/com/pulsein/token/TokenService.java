package com.pulsein.token;

import com.pulsein.session.AttendanceSession;
import java.nio.ByteBuffer;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Component;

@Component
public class TokenService {

    public static final int CODE_LENGTH = 6;
    private static final int MODULO = 1_000_000;
    private static final String ALGORITHM = "HmacSHA256";

    public record TokenTick(String token, long slot, long expiresAt) {
    }

    public long slotOf(AttendanceSession session, long epochMillis) {
        return epochMillis / slotMillis(session);
    }

    public TokenTick tick(AttendanceSession session, long epochMillis) {
        long slot = slotOf(session, epochMillis);
        return new TokenTick(code(session.getSecret(), slot), slot, (slot + 1) * slotMillis(session));
    }

    public boolean matches(AttendanceSession session, String token, long slot) {
        byte[] expected = code(session.getSecret(), slot).getBytes(StandardCharsets.US_ASCII);
        return MessageDigest.isEqual(expected, token.getBytes(StandardCharsets.US_ASCII));
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

    private long slotMillis(AttendanceSession session) {
        return session.getSlotSeconds() * 1000L;
    }
}
