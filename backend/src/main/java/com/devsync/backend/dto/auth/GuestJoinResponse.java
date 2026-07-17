package com.devsync.backend.dto.auth;

import com.devsync.backend.dto.room.RoomResponse;
import java.util.UUID;

public record GuestJoinResponse(
        RoomResponse room,
        UUID sessionId,
        String guestAccessToken,
        String tokenType,
        long expiresInSeconds,
        GuestIdentity guest
) {
    public record GuestIdentity(UUID id, String displayName, String role) {
    }
}
