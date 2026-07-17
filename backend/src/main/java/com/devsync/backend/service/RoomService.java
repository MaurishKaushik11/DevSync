package com.devsync.backend.service;

import com.devsync.backend.dto.auth.GuestJoinRequest;
import com.devsync.backend.dto.auth.GuestJoinResponse;
import com.devsync.backend.dto.room.*;
import com.devsync.backend.entity.*;
import com.devsync.backend.exception.ApiException;
import com.devsync.backend.repository.*;
import com.devsync.backend.security.AuthPrincipal;
import com.devsync.backend.security.JwtService;
import com.devsync.backend.service.importing.ImportedFile;
import com.devsync.backend.service.importing.RepositoryImportService;
import com.devsync.backend.util.GitHubRepositoryUrlValidator;
import com.devsync.backend.util.SecurityUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class RoomService {

    private static final String[] DEFAULT_FILES = {
            "index.html:html:<!DOCTYPE html>\n<html>\n<head>\n  <link rel=\"stylesheet\" href=\"style.css\">\n</head>\n<body>\n  <h1>Hello DevSync</h1>\n  <script src=\"script.js\"></script>\n</body>\n</html>",
            "style.css:css:body {\n  font-family: sans-serif;\n  margin: 2rem;\n}\n",
            "script.js:javascript:console.log('DevSync ready');\n"
    };

    private final RoomRepository roomRepository;
    private final RoomFileRepository roomFileRepository;
    private final RoomMemberRepository roomMemberRepository;
    private final CollaborationSessionRepository collaborationSessionRepository;
    private final AppUserRepository appUserRepository;
    private final RoomAuthorizationService roomAuthorizationService;
    private final DocumentPersistenceService documentPersistenceService;
    private final DocumentSnapshotScheduler documentSnapshotScheduler;
    private final RepositoryImportService repositoryImportService;
    private final JwtService jwtService;
    private final TransactionTemplate transactionTemplate;
    private final long guestTokenMinutes;

    public RoomService(
            RoomRepository roomRepository,
            RoomFileRepository roomFileRepository,
            RoomMemberRepository roomMemberRepository,
            CollaborationSessionRepository collaborationSessionRepository,
            AppUserRepository appUserRepository,
            RoomAuthorizationService roomAuthorizationService,
            DocumentPersistenceService documentPersistenceService,
            DocumentSnapshotScheduler documentSnapshotScheduler,
            RepositoryImportService repositoryImportService,
            JwtService jwtService,
            PlatformTransactionManager transactionManager,
            @Value("${app.jwt.guest-token-minutes:120}") long guestTokenMinutes) {
        this.roomRepository = roomRepository;
        this.roomFileRepository = roomFileRepository;
        this.roomMemberRepository = roomMemberRepository;
        this.collaborationSessionRepository = collaborationSessionRepository;
        this.appUserRepository = appUserRepository;
        this.roomAuthorizationService = roomAuthorizationService;
        this.documentPersistenceService = documentPersistenceService;
        this.documentSnapshotScheduler = documentSnapshotScheduler;
        this.repositoryImportService = repositoryImportService;
        this.jwtService = jwtService;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
        this.guestTokenMinutes = guestTokenMinutes;
    }

    @Transactional
    public RoomResponse createRoom(AuthPrincipal principal, CreateRoomRequest request) {
        roomAuthorizationService.requireAccount(principal);
        AppUser host = requireHostUser(principal);
        String name = request.name().trim();
        if (name.isEmpty()) {
            throw ApiException.badRequest("Room name is required");
        }
        return createHostOwnedRoom(host, name, defaultImportedFiles());
    }

    public RoomResponse importRepository(AuthPrincipal principal, ImportRoomRequest request) {
        roomAuthorizationService.requireAccount(principal);
        AppUser host = requireHostUser(principal);

        GitHubRepositoryUrlValidator.ParsedRepository parsed =
                GitHubRepositoryUrlValidator.parse(request.repositoryUrl());

        String requestedName = request.name() != null ? request.name().trim() : "";
        final String roomName = requestedName.isEmpty() ? parsed.defaultRoomName() : requestedName;

        // Clone outside the persistence transaction to avoid holding a DB connection.
        List<ImportedFile> files = repositoryImportService.importPublicRepository(parsed.httpsCloneUrl());
        return transactionTemplate.execute(status -> createHostOwnedRoom(host, roomName, files));
    }

    @Transactional(readOnly = true)
    public List<RoomResponse> listRooms(AuthPrincipal principal) {
        roomAuthorizationService.requireAccount(principal);
        return roomRepository.findActiveRoomsForUser(principal.getSubjectId()).stream()
                .map(room -> {
                    UUID sessionId = collaborationSessionRepository
                            .findFirstByRoomIdAndStatusOrderByStartedAtDesc(room.getId(), SessionStatus.IN_PROGRESS)
                            .map(CollaborationSession::getId)
                            .orElse(null);
                    RoomMemberRole role = roomMemberRepository.findByRoomIdAndUserId(room.getId(), principal.getSubjectId())
                            .map(RoomMember::getRole)
                            .orElse(RoomMemberRole.VIEWER);
                    List<RoomFile> files = roomFileRepository.findByRoomId(room.getId());
                    return toRoomResponse(room, files, sessionId, role);
                })
                .toList();
    }

    @Transactional
    public RoomResponse getRoom(AuthPrincipal principal, UUID roomId) {
        Room room = requireActiveRoom(roomId);
        RoomMemberRole role = roomAuthorizationService.resolveRole(principal, roomId);
        CollaborationSession session = ensureActiveSession(room);
        documentPersistenceService.hydrateRedisIfAbsent(session.getId(), room.getId());
        List<RoomFile> files = roomFileRepository.findByRoomId(roomId);
        return toRoomResponse(room, files, session.getId(), role);
    }

    @Transactional(readOnly = true)
    public FileContentResponse getFileContent(AuthPrincipal principal, UUID roomId, UUID fileId) {
        roomAuthorizationService.requireCanRead(principal, roomId);
        requireActiveRoom(roomId);
        RoomFile file = roomFileRepository.findByIdAndRoomId(fileId, roomId)
                .orElseThrow(() -> ApiException.notFound("File not found"));
        return new FileContentResponse(file.getContent());
    }

    @Transactional
    public RoomResponse renameRoom(AuthPrincipal principal, UUID roomId, RenameRoomRequest request) {
        roomAuthorizationService.requireHost(principal, roomId);
        Room room = requireActiveRoom(roomId);
        String name = request.name().trim();
        if (name.isEmpty()) {
            throw ApiException.badRequest("Room name is required");
        }
        room.setName(name);
        room.touchActivity();
        CollaborationSession session = ensureActiveSession(room);
        return toRoomResponse(room, roomFileRepository.findByRoomId(roomId), session.getId(), RoomMemberRole.HOST);
    }

    @Transactional
    public void deleteRoom(AuthPrincipal principal, UUID roomId) {
        roomAuthorizationService.requireHost(principal, roomId);
        Room room = requireActiveRoom(roomId);
        collaborationSessionRepository.findFirstByRoomIdAndStatusOrderByStartedAtDesc(roomId, SessionStatus.IN_PROGRESS)
                .ifPresent(session -> {
                    documentSnapshotScheduler.flushAllForSession(session.getId());
                    session.setStatus(SessionStatus.ENDED);
                    session.setEndedAt(java.time.Instant.now());
                    session.touchActivity();
                });
        room.setDeleted(true);
        room.touchActivity();
    }

    @Transactional
    public GuestJoinResponse joinByShareId(String shareId, GuestJoinRequest request) {
        String displayName = SecurityUtils.normalizeDisplayName(request.displayName());
        if (!SecurityUtils.isValidDisplayName(displayName)) {
            throw ApiException.badRequest("Invalid display name");
        }
        Room room = roomRepository.findByShareIdAndDeletedFalse(shareId)
                .orElseThrow(() -> ApiException.notFound("Room not found"));
        CollaborationSession session = ensureActiveSession(room);
        documentPersistenceService.hydrateRedisIfAbsent(session.getId(), room.getId());

        UUID guestId = UUID.randomUUID();
        RoomMemberRole role = RoomMemberRole.EDITOR;
        String guestToken = jwtService.createGuestToken(guestId, displayName, room.getId(), session.getId(), role);

        RoomResponse roomResponse = toRoomResponse(
                room,
                roomFileRepository.findByRoomId(room.getId()),
                session.getId(),
                role
        );

        return new GuestJoinResponse(
                roomResponse,
                session.getId(),
                guestToken,
                "Bearer",
                guestTokenMinutes * 60,
                new GuestJoinResponse.GuestIdentity(guestId, displayName, role.name())
        );
    }

    @Transactional
    public void saveFile(AuthPrincipal principal, UUID roomId, UUID fileId, SaveFileRequest request) {
        roomAuthorizationService.requireCanWrite(principal, roomId);
        documentPersistenceService.saveFileContent(roomId, fileId, request.content());
        Room room = requireActiveRoom(roomId);
        room.touchActivity();
        collaborationSessionRepository.findFirstByRoomIdAndStatusOrderByStartedAtDesc(roomId, SessionStatus.IN_PROGRESS)
                .ifPresent(session -> documentPersistenceService.hydrateRedisIfAbsent(session.getId(), roomId));
    }

    @Transactional
    public void endSession(AuthPrincipal principal, UUID roomId) {
        roomAuthorizationService.requireHost(principal, roomId);
        Room room = requireActiveRoom(roomId);
        CollaborationSession session = collaborationSessionRepository
                .findFirstByRoomIdAndStatusOrderByStartedAtDesc(roomId, SessionStatus.IN_PROGRESS)
                .orElseThrow(() -> ApiException.notFound("No active session"));
        documentSnapshotScheduler.flushAllForSession(session.getId());
        session.setStatus(SessionStatus.ENDED);
        session.setEndedAt(java.time.Instant.now());
        session.touchActivity();
        room.touchActivity();
    }

    @Transactional
    public CollaborationSession ensureActiveSession(Room room) {
        return collaborationSessionRepository
                .findFirstByRoomIdAndStatusOrderByStartedAtDesc(room.getId(), SessionStatus.IN_PROGRESS)
                .orElseGet(() -> startSession(room));
    }

    private RoomResponse createHostOwnedRoom(AppUser host, String name, List<ImportedFile> files) {
        Room room = new Room();
        room.setName(name);
        room.setShareId(SecurityUtils.generateShareId());
        room.setHost(host);
        roomRepository.save(room);

        RoomMember membership = new RoomMember();
        membership.setRoom(room);
        membership.setUser(host);
        membership.setRole(RoomMemberRole.HOST);
        roomMemberRepository.save(membership);
        room.getMembers().add(membership);

        for (ImportedFile imported : files) {
            RoomFile file = new RoomFile();
            file.setRoom(room);
            file.setName(imported.relativePath());
            file.setLanguage(imported.language());
            file.setContent(imported.content());
            file.setSizeBytes(imported.sizeBytes());
            file.setCollaborationEnabled(imported.collaborationEnabled());
            roomFileRepository.save(file);
            room.getFiles().add(file);
        }

        CollaborationSession session = startSession(room);
        documentPersistenceService.hydrateRedisIfAbsent(session.getId(), room.getId());

        return toRoomResponse(room, session.getId(), RoomMemberRole.HOST);
    }

    private List<ImportedFile> defaultImportedFiles() {
        List<ImportedFile> files = new ArrayList<>(DEFAULT_FILES.length);
        for (String spec : DEFAULT_FILES) {
            String[] parts = spec.split(":", 3);
            String content = parts[2];
            long size = content.getBytes(StandardCharsets.UTF_8).length;
            files.add(new ImportedFile(parts[0], parts[1], content, size, true));
        }
        return files;
    }

    private AppUser requireHostUser(AuthPrincipal principal) {
        return appUserRepository.findById(principal.getSubjectId())
                .orElseThrow(() -> ApiException.unauthorized("User not found"));
    }

    private CollaborationSession startSession(Room room) {
        CollaborationSession session = new CollaborationSession();
        session.setRoom(room);
        session.setStatus(SessionStatus.IN_PROGRESS);
        session.setStartedAt(java.time.Instant.now());
        collaborationSessionRepository.save(session);
        room.getSessions().add(session);
        room.touchActivity();
        return session;
    }

    private Room requireActiveRoom(UUID roomId) {
        return roomRepository.findById(roomId)
                .filter(r -> !r.isDeleted())
                .orElseThrow(() -> ApiException.notFound("Room not found"));
    }

    private RoomResponse toRoomResponse(Room room, UUID sessionId, RoomMemberRole role) {
        List<RoomFile> files = room.getFiles().isEmpty()
                ? roomFileRepository.findByRoomId(room.getId())
                : room.getFiles();
        return toRoomResponse(room, files, sessionId, role);
    }

    private RoomResponse toRoomResponse(Room room, List<RoomFile> files, UUID sessionId, RoomMemberRole role) {
        List<RoomFileResponse> fileResponses = files.stream()
                .sorted(Comparator.comparing(RoomFile::getName))
                .map(this::toFileResponse)
                .toList();
        return new RoomResponse(
                room.getId(),
                room.getName(),
                room.getShareId(),
                sessionId,
                role.name(),
                fileResponses,
                room.getLastActivityAt(),
                room.getCreatedAt()
        );
    }

    private RoomFileResponse toFileResponse(RoomFile file) {
        boolean collab = file.isCollaborationEnabled();
        return new RoomFileResponse(
                file.getId(),
                file.getName(),
                file.getLanguage(),
                collab ? file.getContent() : null,
                file.getSizeBytes(),
                collab,
                file.getUpdatedAt()
        );
    }
}
