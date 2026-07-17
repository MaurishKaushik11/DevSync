package com.devsync.backend.dto.room;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record RoomResponse(
        UUID id,
        String name,
        String shareId,
        UUID activeSessionId,
        String role,
        List<RoomFileResponse> files,
        Instant lastActivityAt,
        Instant createdAt
) {
}
