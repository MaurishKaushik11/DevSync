package com.devsync.backend.controller;

import com.devsync.backend.dto.DocumentContentPayload;
import com.devsync.backend.dto.room.CreateRoomRequest;
import com.devsync.backend.dto.room.RoomResponse;
import com.devsync.backend.entity.SessionStatus;
import com.devsync.backend.exception.ApiException;
import com.devsync.backend.repository.CollaborationSessionRepository;
import com.devsync.backend.security.AuthPrincipal;
import com.devsync.backend.service.DocumentPersistenceService;
import com.devsync.backend.service.OtService;
import com.devsync.backend.service.RoomAuthorizationService;
import com.devsync.backend.service.RoomService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Compatibility session endpoints backed by the room collaboration model.
 * Unauthenticated session creation is no longer allowed.
 */
@RestController
@RequestMapping("/api/sessions")
public class SessionController {

    private final OtService otService;
    private final RoomService roomService;
    private final RoomAuthorizationService roomAuthorizationService;
    private final CollaborationSessionRepository collaborationSessionRepository;
    private final DocumentPersistenceService documentPersistenceService;
    private static final Logger logger = Logger.getLogger(SessionController.class.getName());

    public SessionController(
            OtService otService,
            RoomService roomService,
            RoomAuthorizationService roomAuthorizationService,
            CollaborationSessionRepository collaborationSessionRepository,
            DocumentPersistenceService documentPersistenceService) {
        this.otService = otService;
        this.roomService = roomService;
        this.roomAuthorizationService = roomAuthorizationService;
        this.collaborationSessionRepository = collaborationSessionRepository;
        this.documentPersistenceService = documentPersistenceService;
    }

    @PostMapping("/create")
    public ResponseEntity<Map<String, String>> createSession(
            @AuthenticationPrincipal AuthPrincipal principal,
            @RequestBody(required = false) Map<String, String> request) {
        roomAuthorizationService.requireAccount(principal);
        String roomName = request != null ? request.getOrDefault("creatorName", "Untitled Room") : "Untitled Room";
        RoomResponse room = roomService.createRoom(principal, new CreateRoomRequest(roomName));
        logger.info("Created room-backed session: " + room.activeSessionId() + " for room " + room.id());
        return ResponseEntity.ok(Map.of(
                "sessionId", room.activeSessionId().toString(),
                "roomId", room.id().toString(),
                "shareId", room.shareId()
        ));
    }

    @GetMapping("/{sessionId}")
    public ResponseEntity<Map<String, Object>> getSessionInfo(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable String sessionId) {
        UUID sid = parseUuid(sessionId);
        roomAuthorizationService.requireCanAccessSession(principal, sid);
        var session = collaborationSessionRepository.findById(sid)
                .orElseThrow(() -> ApiException.notFound("Session not found"));
        return ResponseEntity.ok(Map.of(
                "id", session.getId().toString(),
                "roomId", session.getRoom().getId().toString(),
                "status", session.getStatus().name(),
                "createdAt", session.getStartedAt().toString()
        ));
    }

    @PostMapping("/{sessionId}/set-document")
    public ResponseEntity<Void> setDocumentContent(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable String sessionId,
            @RequestBody DocumentContentPayload payload) {

        UUID sid = parseUuid(sessionId);
        roomAuthorizationService.requireCanWriteSession(principal, sid);

        if (payload.getDocumentId() == null || payload.getDocumentId().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        var session = collaborationSessionRepository.findByIdAndStatus(sid, SessionStatus.IN_PROGRESS)
                .orElseThrow(() -> ApiException.notFound("Session not found"));

        try {
            otService.setDocumentContent(sessionId, payload.getDocumentId(), payload.getContent());
            documentPersistenceService.snapshotDocument(session.getRoom().getId(), sid, payload.getDocumentId());
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            logger.log(Level.SEVERE, "Error setting document content", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    private UUID parseUuid(String value) {
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException e) {
            throw ApiException.notFound("Session not found");
        }
    }
}
