## 실행

```bash
docker compose up -d     # PostgreSQL 5433, Redis 6379
./gradlew bootRun        # http://localhost:8081
```
## 출석 토큰 (6자리 OTP)

- 출석을 시작하면 세션마다 32바이트 비밀키를 만든다.
- `코드 = HMAC-SHA256(비밀키, 슬롯 번호)`를 6자리 숫자로 줄인다 (HOTP와 같은 방식). 슬롯은 5초.
- 0.5초마다 `/topic/sessions/{id}/token`으로 `{ token, slot, expiresAt }`을 보낸다. 담당 교수만 구독할 수 있다.
- 출석 제출 시 학생이 수강 중인 열린 세션에 대해 현재·직전 슬롯 코드와 비교한다.

| 응답 code | 조건 |
| --- | --- |
| PRESENT / LATE | 현재·직전 슬롯과 일치, 지각 기준 시간으로 구분 |
| DUPLICATE | 이미 출석함 |
| TOKEN_EXPIRED | 내 세션의 2~13 슬롯 전 코드 |
| SESSION_CLOSED | 10분 안에 끝난 내 세션의 코드 |
| NOT_ENROLLED | 수강하지 않는 다른 열린 세션의 코드 |
| UNREGISTERED_DEVICE | 처음 출석한 기기와 다른 기기 |
| INVALID_TOKEN | 아무것과도 맞지 않음 |

실패도 HTTP 200에 `code`로 돌려준다. 학생당 10초에 10번까지 받고, 넘으면 429.

## API

| 메서드 | 경로 | 권한 |
| --- | --- | --- |
| POST | /api/auth/login | 전체 |
| GET | /api/me/courses | 로그인 |
| GET | /api/courses/{courseId}/sessions/active | 교수 (없으면 204) |
| POST | /api/courses/{courseId}/sessions | 교수 |
| PATCH | /api/sessions/{sessionId} | 교수 |
| GET | /api/sessions/{sessionId} | 교수 |
| GET | /api/sessions/{sessionId}/records | 교수 |
| PUT | /api/sessions/{sessionId}/records/{userId} | 교수, 변경 이력 저장 |
| POST | /api/check-in | 학생 |
| STOMP | /ws → /topic/sessions/{id}/token | 교수, CONNECT 헤더에 `Authorization: Bearer <JWT>` |

