package com.devsync.backend.security;

import com.devsync.backend.service.RoomAuthorizationService;
import io.jsonwebtoken.JwtException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    private static final Logger log = LoggerFactory.getLogger(StompAuthChannelInterceptor.class);
    private static final Pattern SESSION_TOPIC = Pattern.compile("^/topic/sessions/([^/]+)/.*");

    private final JwtService jwtService;
    private final RoomAuthorizationService roomAuthorizationService;

    public StompAuthChannelInterceptor(JwtService jwtService, RoomAuthorizationService roomAuthorizationService) {
        this.jwtService = jwtService;
        this.roomAuthorizationService = roomAuthorizationService;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) {
            return message;
        }

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String auth = firstNativeHeader(accessor, "Authorization");
            if (auth == null) {
                auth = firstNativeHeader(accessor, "authorization");
            }
            if (auth == null || !auth.startsWith("Bearer ")) {
                throw new IllegalArgumentException("STOMP CONNECT requires Authorization Bearer token");
            }
            try {
                AuthPrincipal principal = jwtService.parsePrincipal(auth.substring(7).trim());
                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
                accessor.setUser(authentication);
            } catch (JwtException | IllegalArgumentException e) {
                throw new IllegalArgumentException("Invalid STOMP authentication token");
            }
            return message;
        }

        if (StompCommand.SUBSCRIBE.equals(accessor.getCommand()) || StompCommand.SEND.equals(accessor.getCommand())) {
            if (accessor.getUser() == null || !(accessor.getUser() instanceof UsernamePasswordAuthenticationToken auth)
                    || !(auth.getPrincipal() instanceof AuthPrincipal principal)) {
                // Allow ack topics? Still require auth for room-scoped destinations
                String destination = accessor.getDestination();
                if (destination != null && destination.startsWith("/topic/sessions/")) {
                    throw new IllegalArgumentException("Unauthorized STOMP destination access");
                }
                return message;
            }

            String destination = accessor.getDestination();
            if (destination != null) {
                Matcher matcher = SESSION_TOPIC.matcher(destination);
                if (matcher.matches()) {
                    try {
                        UUID sessionId = UUID.fromString(matcher.group(1));
                        roomAuthorizationService.requireCanAccessSession(principal, sessionId);
                    } catch (Exception e) {
                        log.warn("Rejecting STOMP {} to {}: {}", accessor.getCommand(), destination, e.getMessage());
                        throw new IllegalArgumentException("Unauthorized room-scoped STOMP access");
                    }
                }
            }
        }

        return message;
    }

    private String firstNativeHeader(StompHeaderAccessor accessor, String name) {
        List<String> values = accessor.getNativeHeader(name);
        if (values == null || values.isEmpty()) {
            return null;
        }
        return values.get(0);
    }
}
