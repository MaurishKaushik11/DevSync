package com.devsync.backend.dto.room;

import java.time.Instant;
import java.util.UUID;

public record RoomFileResponse(
        UUID id,
        String name,
        String language,
        String content,
        long sizeBytes,
        boolean collaborationEnabled,
        Instant updatedAt
) {
}
