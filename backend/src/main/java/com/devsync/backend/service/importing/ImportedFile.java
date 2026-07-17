package com.devsync.backend.service.importing;

/**
 * A text file selected for import into a room.
 */
public record ImportedFile(
        String relativePath,
        String language,
        String content,
        long sizeBytes,
        boolean collaborationEnabled
) {
}
