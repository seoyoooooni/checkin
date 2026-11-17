CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    number        VARCHAR(20)  NOT NULL UNIQUE,
    name          VARCHAR(50)  NOT NULL,
    role          VARCHAR(20)  NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE devices (
    id            BIGSERIAL PRIMARY KEY,
    user_id       BIGINT      NOT NULL UNIQUE REFERENCES users (id),
    device_hash   VARCHAR(64) NOT NULL,
    status        VARCHAR(20) NOT NULL,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE courses (
    id           BIGSERIAL PRIMARY KEY,
    name         VARCHAR(100) NOT NULL,
    section      VARCHAR(10)  NOT NULL,
    semester     VARCHAR(10)  NOT NULL,
    professor_id BIGINT       NOT NULL REFERENCES users (id),
    room         VARCHAR(50)  NOT NULL,
    schedule     VARCHAR(50)  NOT NULL
);

CREATE TABLE enrollments (
    id        BIGSERIAL PRIMARY KEY,
    course_id BIGINT NOT NULL REFERENCES courses (id),
    user_id   BIGINT NOT NULL REFERENCES users (id),
    UNIQUE (course_id, user_id)
);
CREATE INDEX idx_enrollments_user ON enrollments (user_id);

CREATE TABLE attendance_sessions (
    id             BIGSERIAL PRIMARY KEY,
    course_id      BIGINT      NOT NULL REFERENCES courses (id),
    started_at     TIMESTAMPTZ NOT NULL,
    ended_at       TIMESTAMPTZ,
    late_after_min INT         NOT NULL,
    slot_seconds   INT         NOT NULL,
    status         VARCHAR(10) NOT NULL,
    secret         BYTEA       NOT NULL
);
CREATE INDEX idx_sessions_status ON attendance_sessions (status);
CREATE UNIQUE INDEX uq_sessions_open_course ON attendance_sessions (course_id) WHERE status = 'OPEN';

CREATE TABLE attendance_records (
    id              BIGSERIAL PRIMARY KEY,
    session_id      BIGINT      NOT NULL REFERENCES attendance_sessions (id),
    user_id         BIGINT      NOT NULL REFERENCES users (id),
    device_id       BIGINT REFERENCES devices (id),
    submitted_at    TIMESTAMPTZ,
    token_slot      BIGINT,
    ip_hash         VARCHAR(64),
    status          VARCHAR(20) NOT NULL,
    manual          BOOLEAN     NOT NULL DEFAULT FALSE,
    suspicion_score INT         NOT NULL DEFAULT 0,
    UNIQUE (session_id, user_id)
);

CREATE TABLE record_audits (
    id            BIGSERIAL PRIMARY KEY,
    record_id     BIGINT      NOT NULL REFERENCES attendance_records (id),
    before_status VARCHAR(20),
    after_status  VARCHAR(20) NOT NULL,
    changed_by    BIGINT      NOT NULL REFERENCES users (id),
    reason        VARCHAR(200),
    changed_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
