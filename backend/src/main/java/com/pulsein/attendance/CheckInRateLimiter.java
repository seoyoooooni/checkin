package com.pulsein.attendance;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class CheckInRateLimiter {

    private final int limit;
    private final long windowMillis;
    private final Map<Long, Deque<Long>> hits = new ConcurrentHashMap<>();

    public CheckInRateLimiter(@Value("${app.attendance.check-in-limit}") int limit,
                              @Value("${app.attendance.check-in-window-seconds}") int windowSeconds) {
        this.limit = limit;
        this.windowMillis = windowSeconds * 1000L;
    }

    public boolean tryAcquire(Long userId) {
        long now = System.currentTimeMillis();
        Deque<Long> q = hits.computeIfAbsent(userId, k -> new ArrayDeque<>());
        synchronized (q) {
            while (!q.isEmpty() && now - q.peekFirst() > windowMillis) {
                q.pollFirst();
            }
            if (q.size() >= limit) {
                return false;
            }
            q.addLast(now);
            return true;
        }
    }

    @Scheduled(fixedRate = 60_000)
    public void evictIdle() {
        long now = System.currentTimeMillis();
        hits.entrySet().removeIf(e -> {
            synchronized (e.getValue()) {
                Long last = e.getValue().peekLast();
                return last == null || now - last > windowMillis;
            }
        });
    }
}
