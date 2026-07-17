package com.devsync.backend.dto.room;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ImportRoomRequest(
        @NotBlank @Size(max = 512) String repositoryUrl,
        @Size(max = 200) String name
) {
}
