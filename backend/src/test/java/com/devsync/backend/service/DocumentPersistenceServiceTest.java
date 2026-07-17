package com.devsync.backend.service;

import com.devsync.backend.config.props.AppProperties;
import com.devsync.backend.entity.RoomFile;
import com.devsync.backend.exception.ApiException;
import com.devsync.backend.repository.RoomFileRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DocumentPersistenceServiceTest {

    @Mock private RoomFileRepository roomFileRepository;
    @Mock private OtService otService;

    @Test
    void hydrateOnlyWhenRedisKeyAbsent() {
        AppProperties props = new AppProperties();
        DocumentPersistenceService service = new DocumentPersistenceService(roomFileRepository, otService, props);

        UUID sessionId = UUID.randomUUID();
        UUID roomId = UUID.randomUUID();
        RoomFile file = new RoomFile();
        file.setName("index.html");
        file.setContent("<html/>");
        file.setCollaborationEnabled(true);

        when(roomFileRepository.findByRoomId(roomId)).thenReturn(List.of(file));
        when(otService.hasDocumentContent(sessionId.toString(), "index.html")).thenReturn(false);

        service.hydrateRedisIfAbsent(sessionId, roomId);

        verify(otService).seedDocumentContentIfAbsent(sessionId.toString(), "index.html", "<html/>");
        verify(otService, never()).setDocumentContent(any(), any(), any());
    }

    @Test
    void hydrateSkipsWhenRedisPresent() {
        AppProperties props = new AppProperties();
        DocumentPersistenceService service = new DocumentPersistenceService(roomFileRepository, otService, props);

        UUID sessionId = UUID.randomUUID();
        UUID roomId = UUID.randomUUID();
        RoomFile file = new RoomFile();
        file.setName("index.html");
        file.setContent("<html/>");
        file.setCollaborationEnabled(true);

        when(roomFileRepository.findByRoomId(roomId)).thenReturn(List.of(file));
        when(otService.hasDocumentContent(sessionId.toString(), "index.html")).thenReturn(true);

        service.hydrateRedisIfAbsent(sessionId, roomId);

        verify(otService, never()).seedDocumentContentIfAbsent(any(), any(), any());
    }

    @Test
    void hydrateSkipsCollaborationDisabledFiles() {
        AppProperties props = new AppProperties();
        DocumentPersistenceService service = new DocumentPersistenceService(roomFileRepository, otService, props);

        UUID sessionId = UUID.randomUUID();
        UUID roomId = UUID.randomUUID();
        RoomFile large = new RoomFile();
        large.setName("big.txt");
        large.setContent("huge");
        large.setCollaborationEnabled(false);

        when(roomFileRepository.findByRoomId(roomId)).thenReturn(List.of(large));

        service.hydrateRedisIfAbsent(sessionId, roomId);

        verifyNoInteractions(otService);
    }

    @Test
    void snapshotWritesPostgresFromRedis() {
        AppProperties props = new AppProperties();
        DocumentPersistenceService service = new DocumentPersistenceService(roomFileRepository, otService, props);

        UUID sessionId = UUID.randomUUID();
        UUID roomId = UUID.randomUUID();
        RoomFile file = new RoomFile();
        file.setName("script.js");
        file.setContent("old");
        file.setCollaborationEnabled(true);

        when(otService.getDocumentContent(sessionId.toString(), "script.js")).thenReturn("new content");
        when(roomFileRepository.findByRoomIdAndName(roomId, "script.js")).thenReturn(Optional.of(file));

        service.snapshotDocument(roomId, sessionId, "script.js");

        verify(roomFileRepository).save(file);
        assert file.getContent().equals("new content");
    }

    @Test
    void snapshotRejectsCollaborationDisabled() {
        AppProperties props = new AppProperties();
        DocumentPersistenceService service = new DocumentPersistenceService(roomFileRepository, otService, props);

        UUID sessionId = UUID.randomUUID();
        UUID roomId = UUID.randomUUID();
        RoomFile file = new RoomFile();
        file.setName("big.txt");
        file.setCollaborationEnabled(false);

        when(roomFileRepository.findByRoomIdAndName(roomId, "big.txt")).thenReturn(Optional.of(file));

        assertThatThrownBy(() -> service.snapshotDocument(roomId, sessionId, "big.txt"))
                .isInstanceOf(ApiException.class)
                .extracting(ex -> ((ApiException) ex).getCode())
                .isEqualTo("COLLABORATION_DISABLED");
        verify(otService, never()).getDocumentContent(any(), any());
        verify(roomFileRepository, never()).save(any());
    }

    @Test
    void saveRejectsCollaborationDisabled() {
        AppProperties props = new AppProperties();
        DocumentPersistenceService service = new DocumentPersistenceService(roomFileRepository, otService, props);

        UUID roomId = UUID.randomUUID();
        UUID fileId = UUID.randomUUID();
        RoomFile file = new RoomFile();
        file.setCollaborationEnabled(false);

        when(roomFileRepository.findByIdAndRoomId(fileId, roomId)).thenReturn(Optional.of(file));

        assertThatThrownBy(() -> service.saveFileContent(roomId, fileId, "nope"))
                .isInstanceOf(ApiException.class)
                .extracting(ex -> ((ApiException) ex).getCode())
                .isEqualTo("COLLABORATION_DISABLED");
    }
}
