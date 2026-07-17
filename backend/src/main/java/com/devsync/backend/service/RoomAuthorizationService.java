package com.devsync.backend.service;

import com.devsync.backend.entity.RoomMemberRole;
import com.devsync.backend.exception.ApiException;
import com.devsync.backend.repository.CollaborationSessionRepository;
import com.devsync.backend.repository.RoomMemberRepository;
import com.devsync.backend.security.AuthPrincipal;
import com.devsync.backend.security.PrincipalType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class RoomAuthorizationService {

    private final RoomMemberRepository roomMemberRepository;
    private final CollaborationSessionRepository collaborationSessionRepository;

    public RoomAuthorizationService(
            RoomMemberRepository roomMemberRepository,
            CollaborationSessionRepository collaborationSessionRepository) {
        this.roomMemberRepository = roomMemberRepository;
        this.collaborationSessionRepository = collaborationSessionRepository;
    }

    @Transactional(readOnly = true)
    public RoomMemberRole resolveRole(AuthPrincipal principal, UUID roomId) {
        if (principal == null) {
            throw ApiException.unauthorized("Authentication required");
        }
        if (principal.isGuest()) {
            if (!roomId.equals(principal.getRoomId())) {
                throw ApiException.forbidden("Guest token is not scoped to this room");
            }
            return principal.getGuestRole() != null ? principal.getGuestRole() : RoomMemberRole.EDITOR;
        }
        return roomMemberRepository.findByRoomIdAndUserId(roomId, principal.getSubjectId())
                .map(m -> m.getRole())
                .orElseThrow(() -> ApiException.forbidden("Not a member of this room"));
    }

    public void requireCanRead(AuthPrincipal principal, UUID roomId) {
        resolveRole(principal, roomId);
    }

    public void requireCanWrite(AuthPrincipal principal, UUID roomId) {
        RoomMemberRole role = resolveRole(principal, roomId);
        if (role == RoomMemberRole.VIEWER) {
            throw ApiException.forbidden("Viewers cannot modify code");
        }
    }

    public void requireHost(AuthPrincipal principal, UUID roomId) {
        RoomMemberRole role = resolveRole(principal, roomId);
        if (role != RoomMemberRole.HOST) {
            throw ApiException.forbidden("Only the host can perform this action");
        }
    }

    @Transactional(readOnly = true)
    public UUID resolveRoomIdForSession(UUID sessionId) {
        return collaborationSessionRepository.findRoomIdBySessionId(sessionId)
                .orElseThrow(() -> ApiException.notFound("Session not found"));
    }

    public void requireCanWriteSession(AuthPrincipal principal, UUID sessionId) {
        UUID roomId = resolveRoomIdForSession(sessionId);
        if (principal.isGuest()) {
            if (!sessionId.equals(principal.getSessionId()) || !roomId.equals(principal.getRoomId())) {
                throw ApiException.forbidden("Guest token is not scoped to this session");
            }
        }
        requireCanWrite(principal, roomId);
    }

    public void requireCanAccessSession(AuthPrincipal principal, UUID sessionId) {
        UUID roomId = resolveRoomIdForSession(sessionId);
        if (principal.isGuest()) {
            if (!sessionId.equals(principal.getSessionId()) || !roomId.equals(principal.getRoomId())) {
                throw ApiException.forbidden("Guest token is not scoped to this session");
            }
            return;
        }
        requireCanRead(principal, roomId);
    }

    public void requireAccount(AuthPrincipal principal) {
        if (principal == null || principal.getType() != PrincipalType.ACCOUNT) {
            throw ApiException.unauthorized("Account authentication required");
        }
    }
}
