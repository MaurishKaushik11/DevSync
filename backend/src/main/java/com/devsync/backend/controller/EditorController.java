package com.devsync.backend.controller;

import com.devsync.backend.dto.UserInfo;
import com.devsync.backend.dto.UserInfoDTO;
import com.devsync.backend.dto.CursorMessage;
import com.devsync.backend.dto.Position;
import com.devsync.backend.dto.DocumentState;
import com.devsync.backend.service.SessionRegistryService;
import com.devsync.backend.service.OtService;
import com.devsync.backend.service.RoomAuthorizationService;
import com.devsync.backend.service.DocumentPersistenceService;
import com.devsync.backend.dto.JoinPayload;
import com.devsync.backend.dto.SelectionInfo;
import com.devsync.backend.security.AuthPrincipal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.SetOperations;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Controller
public class EditorController {

    private static final Logger log = LoggerFactory.getLogger(EditorController.class);

    private final SimpMessagingTemplate messagingTemplate;
    private final SessionRegistryService sessionRegistryService;
    private final OtService otService;
    private final StringRedisTemplate stringRedisTemplate;
    private final SetOperations<String, String> setOperations;
    private final RoomAuthorizationService roomAuthorizationService;
    private final DocumentPersistenceService documentPersistenceService;

    private static final String USER_ACTIVE_DOCS_KEY_PREFIX = "user:active_docs:";
    private static final long USER_TRACKING_EXPIRY_HOURS = 24;

    @Autowired
    public EditorController(
            SimpMessagingTemplate messagingTemplate,
            SessionRegistryService sessionRegistryService,
            OtService otService,
            StringRedisTemplate stringRedisTemplate,
            RoomAuthorizationService roomAuthorizationService,
            DocumentPersistenceService documentPersistenceService) {
        this.messagingTemplate = messagingTemplate;
        this.sessionRegistryService = sessionRegistryService;
        this.otService = otService;
        this.stringRedisTemplate = stringRedisTemplate;
        this.setOperations = stringRedisTemplate.opsForSet();
        this.roomAuthorizationService = roomAuthorizationService;
        this.documentPersistenceService = documentPersistenceService;
    }

    private String getUserTrackingKey(String userId) {
        return USER_ACTIVE_DOCS_KEY_PREFIX + userId;
    }

    private AuthPrincipal requirePrincipal(Principal principal) {
        if (principal instanceof UsernamePasswordAuthenticationToken token
                && token.getPrincipal() instanceof AuthPrincipal authPrincipal) {
            return authPrincipal;
        }
        if (principal instanceof AuthPrincipal authPrincipal) {
            return authPrincipal;
        }
        throw new IllegalArgumentException("Unauthenticated WebSocket principal");
    }

    @MessageMapping("/join")
    public void handleJoin(@Payload JoinPayload payload,
                           SimpMessageHeaderAccessor headerAccessor,
                           Principal principal) {

        AuthPrincipal auth = requirePrincipal(principal);
        String sessionId = payload.getSessionId();
        String documentId = payload.getDocumentId();

        if (sessionId == null || documentId == null) {
            log.warn("Invalid join payload received. Missing session/document. Payload: {}", payload);
            return;
        }

        try {
            UUID sid = UUID.fromString(sessionId);
            roomAuthorizationService.requireCanAccessSession(auth, sid);
            UUID roomId = roomAuthorizationService.resolveRoomIdForSession(sid);
            documentPersistenceService.hydrateRedisIfAbsent(sid, roomId);
        } catch (Exception e) {
            log.warn("Join denied for session [{}]: {}", sessionId, e.getMessage());
            return;
        }

        // Identity derived from principal — do not trust payload userId
        String userId = auth.getSubjectId().toString();
        String userName = auth.getDisplayName() != null ? auth.getDisplayName()
                : (payload.getUserName() != null ? payload.getUserName() : "User");
        String userColor = payload.getUserColor() != null ? payload.getUserColor() : "#4A90D9";

        log.info("Received join request from principal [{}] for session [{}] doc [{}]", userId, sessionId, documentId);

        UserInfoDTO userInfoDTO = new UserInfoDTO();
        userInfoDTO.setId(userId);
        userInfoDTO.setName(userName);
        userInfoDTO.setColor(userColor);
        userInfoDTO.setCursorPosition(null);
        userInfoDTO.setSelection(null);

        try {
            sessionRegistryService.userJoined(sessionId, documentId, userInfoDTO);
            log.info("User [{}] registered in session [{}], doc [{}] via /app/join", userId, sessionId, documentId);

            String trackingKey = getUserTrackingKey(userId);
            String documentEntry = sessionId + ":" + documentId;
            try {
                setOperations.add(trackingKey, documentEntry);
                stringRedisTemplate.expire(trackingKey, USER_TRACKING_EXPIRY_HOURS, TimeUnit.HOURS);
            } catch (Exception redisEx) {
                log.error("Redis error tracking join for user [{}]: {}", userId, redisEx.getMessage());
            }

            broadcastFullDocumentState(sessionId, documentId, userId);
        } catch (Exception e) {
            log.error("Error processing join for user [{}]: {}", userId, e.getMessage(), e);
        }
    }

    @MessageMapping("/selection")
    public void handleSelectionUpdate(@Payload CursorMessage message,
                                      SimpMessageHeaderAccessor headerAccessor,
                                      Principal principal) {

        AuthPrincipal auth;
        try {
            auth = requirePrincipal(principal);
        } catch (Exception e) {
            log.warn("Selection rejected: unauthenticated");
            return;
        }

        String sessionId = message.getSessionId();
        String documentId = message.getDocumentId();
        if (sessionId == null || documentId == null) {
            log.warn("Received invalid selection message: {}", message);
            return;
        }

        try {
            roomAuthorizationService.requireCanAccessSession(auth, UUID.fromString(sessionId));
        } catch (Exception e) {
            log.warn("Selection denied: {}", e.getMessage());
            return;
        }

        String senderClientId = auth.getSubjectId().toString();
        UserInfo senderUserInfo = message.getUserInfo();
        if (senderUserInfo == null) {
            senderUserInfo = new UserInfo();
            message.setUserInfo(senderUserInfo);
        }
        senderUserInfo.setId(senderClientId);
        if (senderUserInfo.getName() == null) {
            senderUserInfo.setName(auth.getDisplayName());
        }

        try {
            Map<String, Integer> cursorPositionMap = null;
            Position cursorPosition = senderUserInfo.getCursorPosition();
            if (cursorPosition != null) {
                cursorPositionMap = new HashMap<>();
                cursorPositionMap.put("lineNumber", cursorPosition.getLineNumber());
                cursorPositionMap.put("column", cursorPosition.getColumn());
            }
            SelectionInfo selectionInfo = senderUserInfo.getSelection();
            sessionRegistryService.updateUserState(sessionId, documentId, senderClientId, cursorPositionMap, selectionInfo);
        } catch (Exception e) {
            log.error("Error persisting selection for [{}]: {}", senderClientId, e.getMessage());
        }

        String selectionDestination = String.format("/topic/sessions/%s/selections/document/%s", sessionId, documentId);
        try {
            messagingTemplate.convertAndSend(selectionDestination, message);
        } catch (Exception e) {
            log.error("Error broadcasting selection to {}", selectionDestination, e);
        }
    }

    private void broadcastFullDocumentState(String sessionId, String documentId, String updatedByClientId) {
        log.info("Broadcasting full document state for session [{}], doc [{}] triggered by user [{}]", sessionId, documentId, updatedByClientId);
        try {
            List<UserInfoDTO> participants = sessionRegistryService.getActiveParticipantsForDocument(sessionId, documentId, null);
            String currentContent = otService.getDocumentContent(sessionId, documentId);
            int currentRevision = otService.getRevision(sessionId, documentId);

            DocumentState fullState = new DocumentState();
            fullState.setSessionId(sessionId);
            fullState.setDocumentId(documentId);
            fullState.setDocument(currentContent);
            fullState.setRevision(currentRevision);
            fullState.setParticipants(participants);

            String stateDestination = String.format("/topic/sessions/%s/state/document/%s", sessionId, documentId);
            messagingTemplate.convertAndSend(stateDestination, fullState);
        } catch (Exception e) {
            log.error("Error broadcasting full document state for session [{}], doc [{}]: {}", sessionId, documentId, e.getMessage(), e);
        }
    }
}
