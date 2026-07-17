-- Room file size and collaboration flags for repository import

ALTER TABLE room_files
    ADD COLUMN size_bytes BIGINT NOT NULL DEFAULT 0;

ALTER TABLE room_files
    ADD COLUMN collaboration_enabled BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE room_files
SET size_bytes = COALESCE(LENGTH(content), 0)
WHERE size_bytes = 0;
