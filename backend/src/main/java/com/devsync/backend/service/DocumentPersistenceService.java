package com.devsync.backend.service;

import com.devsync.backend.config.props.AppProperties;
import com.devsync.backend.entity.RoomFile;
import com.devsync.backend.exception.ApiException;
import com.devsync.backend.repository.RoomFileRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class DocumentPersistenceService {

    private static final Logger log = LoggerFactory.getLogger(DocumentPersistenceService.class);

    private final RoomFileRepository roomFileRepository;
    private final OtService otService;
    private final AppProperties appProperties;

    public DocumentPersistenceService(
            RoomFileRepository roomFileRepository,
            OtService otService,
            AppProperties appProperties) {
        this.roomFileRepository = roomFileRepository;
        this.otService = otService;
        this.appProperties = appProperties;
    }

    /**
     * Hydrate Redis from PostgreSQL only when the Redis content key is absent.
     * Does not clear OT history. Skips collaboration-disabled (large) files.
     */
    public void hydrateRedisIfAbsent(UUID sessionId, UUID roomId) {
        List<RoomFile> files = roomFileRepository.findByRoomId(roomId);
        for (RoomFile file : files) {
            hydrateDocumentIfAbsent(sessionId, roomId, file.getName(), file);
        }
    }

    /**
     * Hydrate a single document on demand (preferred on join for large imported repos).
     */
    public void hydrateDocumentIfAbsent(UUID sessionId, UUID roomId, String documentId) {
        RoomFile file = roomFileRepository.findByRoomIdAndName(roomId, documentId).orElse(null);
        hydrateDocumentIfAbsent(sessionId, roomId, documentId, file);
    }

    private void hydrateDocumentIfAbsent(UUID sessionId, UUID roomId, String documentId, RoomFile file) {
        if (file == null) {
            log.debug("No RoomFile named [{}] in room [{}] to hydrate", documentId, roomId);
            return;
        }
        if (!file.isCollaborationEnabled()) {
            return;
        }
        String sessionKey = sessionId.toString();
        if (!otService.hasDocumentContent(sessionKey, documentId)) {
            otService.seedDocumentContentIfAbsent(sessionKey, documentId, file.getContent());
            log.info("Hydrated Redis doc [{}] for session [{}] from RoomFile", documentId, sessionId);
        }
    }

    @Transactional
    public void snapshotDocument(UUID roomId, UUID sessionId, String documentId) {
        RoomFile file = roomFileRepository.findByRoomIdAndName(roomId, documentId)
                .orElse(null);
        if (file == null) {
            log.warn("No RoomFile named [{}] in room [{}] for snapshot", documentId, roomId);
            return;
        }
        if (!file.isCollaborationEnabled()) {
            throw ApiException.collaborationDisabled(
                    "Snapshots are not allowed for collaboration-disabled files");
        }
        String content = otService.getDocumentContent(sessionId.toString(), documentId);
        if (content == null) {
            content = "";
        }
        int max = appProperties.getDocument().getMaxContentChars();
        if (content.length() > max) {
            content = content.substring(0, max);
            log.warn("Truncated snapshot for room [{}] doc [{}] to {} chars", roomId, documentId, max);
        }
        file.setContent(content);
        file.touchActivity();
        roomFileRepository.save(file);
        log.debug("Snapshotted doc [{}] for room [{}] session [{}]", documentId, roomId, sessionId);
    }

    @Transactional
    public void snapshotAllFiles(UUID roomId, UUID sessionId) {
        List<RoomFile> files = roomFileRepository.findByRoomId(roomId);
        for (RoomFile file : files) {
            if (!file.isCollaborationEnabled()) {
                continue;
            }
            snapshotDocument(roomId, sessionId, file.getName());
        }
    }

    @Transactional
    public void saveFileContent(UUID roomId, UUID fileId, String content) {
        RoomFile file = roomFileRepository.findByIdAndRoomId(fileId, roomId)
                .orElseThrow(() -> ApiException.notFound("File not found"));
        if (!file.isCollaborationEnabled()) {
            throw ApiException.collaborationDisabled(
                    "This file is read-only and cannot be saved via collaboration");
        }
        int max = appProperties.getDocument().getMaxContentChars();
        if (content != null && content.length() > max) {
            throw new ApiException(
                    org.springframework.http.HttpStatus.BAD_REQUEST,
                    "CONTENT_TOO_LARGE",
                    "Content exceeds maximum allowed size");
        }
        file.setContent(content != null ? content : "");
        file.touchActivity();
        roomFileRepository.save(file);
    }
}
