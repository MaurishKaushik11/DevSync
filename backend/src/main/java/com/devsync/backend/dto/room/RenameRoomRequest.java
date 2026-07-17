package com.devsync.backend.dto.room;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RenameRoomRequest(
        @NotBlank @Size(min = 1, max = 200) String name
) {
}
