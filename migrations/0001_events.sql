-- 익명 집계 (docs/ARCHITECTURE.md 8절): 날짜·이벤트·구간별 횟수만 센다. IP·기기 정보·쿠키는 없다.
CREATE TABLE IF NOT EXISTS daily_events (
  day    TEXT    NOT NULL,             -- UTC 날짜 YYYY-MM-DD
  type   TEXT    NOT NULL,
  bucket TEXT    NOT NULL DEFAULT '',
  count  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, type, bucket)
);
