package com.devsync.backend.dto.room;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SaveFileRequest(
        @NotNull @Size(max = 500000) String content
) {
}
