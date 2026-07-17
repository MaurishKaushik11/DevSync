package com.devsync.backend.controller;

import com.devsync.backend.dto.DocumentState;
import com.devsync.backend.dto.IncomingOperationPayload;
import com.devsync.backend.dto.TextOperation;
import com.devsync.backend.service.OtService;
import com.devsync.backend.dto.IncomingSelectionPayload;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Controller;
import java.util.HashMap;
import java.util.Map;
import java.util.logging.Logger;
import java.security.Principal;
import java.util.List;
import java.util.Collections;
import java.util.UUID;
import com.devsync.backend.dto.UserInfoDTO;
import com.devsync.backend.security.AuthPrincipal;
import com.devsync.backend.service.SessionRegistryService;
import com.devsync.backend.service.RoomAuthorizationService;

@Controller
public class OtController {
    private final OtService otService;
    private final SimpMessagingTemplate messagingTemplate;
    private final SessionRegistryService sessionRegistryService;
    private final RoomAuthorizationService roomAuthorizationService;
    private static final Logger logger = Logger.getLogger(OtController.class.getName());

    public OtController(
            OtService otService,
            SimpMessagingTemplate messagingTemplate,
            SessionRegistryService sessionRegistryService,
            RoomAuthorizationService roomAuthorizationService) {
        this.otService = otService;
        this.messagingTemplate = messagingTemplate;
        this.sessionRegistryService = sessionRegistryService;
        this.roomAuthorizationService = roomAuthorizationService;
    }

    private AuthPrincipal requirePrincipal(Principal principal) {
        if (principal instanceof UsernamePasswordAuthenticationToken token
                && token.getPrincipal() instanceof AuthPrincipal authPrincipal) {
            return authPrincipal;
        }
        if (principal instanceof AuthPrincipal authPrincipal) {
            return authPrincipal;
        }
        throw new IllegalArgumentException("Unauthenticated");
    }

    @MessageMapping("/operation")
    public void handleOperation(@Payload IncomingOperationPayload payload,
                                SimpMessageHeaderAccessor headerAccessor,
                                Principal principal) {

        AuthPrincipal auth;
        try {
            auth = requirePrincipal(principal);
        } catch (Exception e) {
            logger.warning("Discarding operation: unauthenticated");
            return;
        }

        String documentId = payload.getDocumentId();
        String sessionId = payload.getSessionId();
        // Derive client identity from principal
        String clientId = auth.getSubjectId().toString();

        if (documentId == null || sessionId == null) {
            logger.warning("Received operation without documentId or sessionId. Discarding.");
            return;
        }

        try {
            roomAuthorizationService.requireCanWriteSession(auth, UUID.fromString(sessionId));
        } catch (Exception e) {
            logger.warning("Operation denied for session [" + sessionId + "]: " + e.getMessage());
            return;
        }

        logger.info(String.format("OtController received operation from principal [%s] for session [%s], doc [%s]",
                 clientId, sessionId, documentId));

        try {
            TextOperation operation = new TextOperation(payload.getOperation());
            TextOperation transformedOp = otService.receiveOperation(sessionId, documentId, payload.getRevision(), operation);

            Map<String, Object> broadcastPayload = new HashMap<>();
            broadcastPayload.put("documentId", documentId);
            broadcastPayload.put("clientId", clientId);
            broadcastPayload.put("operation", transformedOp.getOps());
            broadcastPayload.put("sessionId", sessionId);

            if (payload.getSelection() != null) {
                broadcastPayload.put("selection", payload.getSelection());
            }
            if (payload.getCursorPosition() != null) {
                broadcastPayload.put("cursorPosition", payload.getCursorPosition());
            }

            String destination = String.format("/topic/sessions/%s/operations/document/%s", sessionId, documentId);
            messagingTemplate.convertAndSend(destination, broadcastPayload);

            String ackDestination = "/topic/ack/" + clientId;
            messagingTemplate.convertAndSend(ackDestination, "ack");

        } catch (IllegalArgumentException e) {
            logger.warning(String.format("Error processing operation from [%s] session [%s] doc [%s]: %s",
                    clientId, sessionId, documentId, e.getMessage()));
        } catch (Exception e) {
            logger.severe(String.format("Unexpected error processing operation from [%s]: %s", clientId, e.getMessage()));
        }
    }

    @Deprecated
    public void handleSelection(@Payload IncomingSelectionPayload payload,
                                SimpMessageHeaderAccessor headerAccessor,
                                Principal principal) {
        logger.warning("Received message on deprecated /selection endpoint. Payload: " + payload);
    }

    @MessageMapping("/get-document-state")
    public void getDocumentState(@Payload Map<String, String> payload, Principal principal) {
        AuthPrincipal auth;
        try {
            auth = requirePrincipal(principal);
        } catch (Exception e) {
            logger.warning("get-document-state rejected: unauthenticated");
            return;
        }

        String documentId = payload.get("documentId");
        String sessionId = payload.get("sessionId");
        String requestingUserId = auth.getSubjectId().toString();

        if (documentId == null || sessionId == null) {
            logger.warning("Received get-document-state without documentId or sessionId. Ignoring.");
            return;
        }

        try {
            roomAuthorizationService.requireCanAccessSession(auth, UUID.fromString(sessionId));
        } catch (Exception e) {
            logger.warning("get-document-state denied: " + e.getMessage());
            return;
        }

        List<UserInfoDTO> participants = Collections.emptyList();
        try {
            participants = sessionRegistryService.getActiveParticipantsForDocument(sessionId, documentId, null);
        } catch (Exception e) {
            logger.severe("Error fetching participants: " + e.getMessage());
        }

        DocumentState stateResponse = new DocumentState();
        stateResponse.setSessionId(sessionId);
        stateResponse.setDocumentId(documentId);
        stateResponse.setDocument(otService.getDocumentContent(sessionId, documentId));
        stateResponse.setRevision(otService.getRevision(sessionId, documentId));
        stateResponse.setParticipants(participants);

        String destination = String.format("/topic/sessions/%s/state/document/%s", sessionId, documentId);
        messagingTemplate.convertAndSend(destination, stateResponse);
        logger.info(String.format("Sent document state for session [%s], doc [%s] to user [%s]", sessionId, documentId, requestingUserId));
    }
}
