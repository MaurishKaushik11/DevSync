package com.devsync.backend.controller;

import com.devsync.backend.dto.ChatMessage;
import com.devsync.backend.security.AuthPrincipal;
import com.devsync.backend.service.RoomAuthorizationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.UUID;

@Controller
public class ChatController {

    private static final Logger log = LoggerFactory.getLogger(ChatController.class);
    private final SimpMessagingTemplate messagingTemplate;
    private final RoomAuthorizationService roomAuthorizationService;

    @Autowired
    public ChatController(SimpMessagingTemplate messagingTemplate, RoomAuthorizationService roomAuthorizationService) {
        this.messagingTemplate = messagingTemplate;
        this.roomAuthorizationService = roomAuthorizationService;
    }

    @MessageMapping("/chat")
    public void handleChatMessage(@Payload ChatMessage chatMessage, Principal principal) {
        AuthPrincipal auth;
        if (principal instanceof UsernamePasswordAuthenticationToken token
                && token.getPrincipal() instanceof AuthPrincipal ap) {
            auth = ap;
        } else if (principal instanceof AuthPrincipal ap) {
            auth = ap;
        } else {
            log.warn("Chat rejected: unauthenticated");
            return;
        }

        String sessionId = chatMessage.getSessionId();
        if (sessionId == null || chatMessage.getMessage() == null) {
            log.warn("Invalid chat message received: {}", chatMessage);
            return;
        }

        try {
            roomAuthorizationService.requireCanAccessSession(auth, UUID.fromString(sessionId));
        } catch (Exception e) {
            log.warn("Chat denied: {}", e.getMessage());
            return;
        }

        chatMessage.setUserId(auth.getSubjectId().toString());
        if (chatMessage.getUserName() == null) {
            chatMessage.setUserName(auth.getDisplayName());
        }
        if (chatMessage.getTimestamp() == null) {
            chatMessage.setTimestamp(LocalDateTime.now());
        }

        String destination = String.format("/topic/sessions/%s/chat", sessionId);
        messagingTemplate.convertAndSend(destination, chatMessage);
    }
}
