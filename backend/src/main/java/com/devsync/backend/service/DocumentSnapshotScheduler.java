package com.devsync.backend.service;

import com.devsync.backend.config.props.AppProperties;
import com.devsync.backend.repository.CollaborationSessionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledFuture;

@Service
public class DocumentSnapshotScheduler {

    private static final Logger log = LoggerFactory.getLogger(DocumentSnapshotScheduler.class);

    private final TaskScheduler taskScheduler;
    private final DocumentPersistenceService documentPersistenceService;
    private final CollaborationSessionRepository collaborationSessionRepository;
    private final AppProperties appProperties;
    private final Map<String, ScheduledFuture<?>> pending = new ConcurrentHashMap<>();

    public DocumentSnapshotScheduler(
            TaskScheduler documentSnapshotTaskScheduler,
            DocumentPersistenceService documentPersistenceService,
            CollaborationSessionRepository collaborationSessionRepository,
            AppProperties appProperties) {
        this.taskScheduler = documentSnapshotTaskScheduler;
        this.documentPersistenceService = documentPersistenceService;
        this.collaborationSessionRepository = collaborationSessionRepository;
        this.appProperties = appProperties;
    }

    public void scheduleSnapshot(UUID sessionId, String documentId) {
        if (sessionId == null || documentId == null || documentId.isBlank()) {
            return;
        }
        String key = sessionId + ":" + documentId;
        ScheduledFuture<?> previous = pending.remove(key);
        if (previous != null) {
            previous.cancel(false);
        }
        long delayMs = appProperties.getDocument().getSnapshotDebounceMs();
        ScheduledFuture<?> future = taskScheduler.schedule(() -> {
            try {
                UUID roomId = collaborationSessionRepository.findRoomIdBySessionId(sessionId).orElse(null);
                if (roomId == null) {
                    return;
                }
                documentPersistenceService.snapshotDocument(roomId, sessionId, documentId);
            } catch (Exception e) {
                log.warn("Debounced snapshot failed for session [{}] doc [{}]: {}", sessionId, documentId, e.getMessage());
            } finally {
                pending.remove(key);
            }
        }, Instant.now().plusMillis(delayMs));
        pending.put(key, future);
    }

    public void cancel(UUID sessionId, String documentId) {
        String key = sessionId + ":" + documentId;
        ScheduledFuture<?> previous = pending.remove(key);
        if (previous != null) {
            previous.cancel(false);
        }
    }

    public void flushNow(UUID sessionId, String documentId) {
        cancel(sessionId, documentId);
        collaborationSessionRepository.findRoomIdBySessionId(sessionId).ifPresent(roomId ->
                documentPersistenceService.snapshotDocument(roomId, sessionId, documentId));
    }

    public void flushAllForSession(UUID sessionId) {
        pending.keySet().stream()
                .filter(k -> k.startsWith(sessionId + ":"))
                .toList()
                .forEach(k -> {
                    ScheduledFuture<?> f = pending.remove(k);
                    if (f != null) {
                        f.cancel(false);
                    }
                });
        collaborationSessionRepository.findRoomIdBySessionId(sessionId).ifPresent(roomId ->
                documentPersistenceService.snapshotAllFiles(roomId, sessionId));
    }

    /** Visible for tests */
    public boolean hasPending(UUID sessionId, String documentId) {
        ScheduledFuture<?> f = pending.get(sessionId + ":" + documentId);
        return f != null && !f.isDone() && !f.isCancelled();
    }
}
