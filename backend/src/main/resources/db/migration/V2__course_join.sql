ALTER TABLE courses ADD COLUMN join_secret BYTEA;
ALTER TABLE courses ADD COLUMN join_open BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE courses ADD COLUMN join_opened_at TIMESTAMPTZ;
CREATE INDEX idx_courses_join_open ON courses (join_open);
