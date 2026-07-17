package com.devsync.backend.dto.auth;

import java.util.UUID;

public record UserResponse(
        UUID id,
        String email,
        String displayName,
        String authProvider,
        String avatarUrl
) {
}
