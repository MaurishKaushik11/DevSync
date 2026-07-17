package com.devsync.backend.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record GuestJoinRequest(
        @NotBlank @Size(min = 2, max = 100) String displayName
) {
}
