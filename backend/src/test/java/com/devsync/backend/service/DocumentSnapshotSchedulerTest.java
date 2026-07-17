package com.devsync.backend.service;

import com.devsync.backend.config.props.AppProperties;
import com.devsync.backend.repository.CollaborationSessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DocumentSnapshotSchedulerTest {

    @Mock private DocumentPersistenceService documentPersistenceService;
    @Mock private CollaborationSessionRepository collaborationSessionRepository;

    private DocumentSnapshotScheduler scheduler;
    private UUID sessionId;
    private UUID roomId;

    @BeforeEach
    void setUp() {
        ThreadPoolTaskScheduler taskScheduler = new ThreadPoolTaskScheduler();
        taskScheduler.setPoolSize(2);
        taskScheduler.setThreadNamePrefix("test-snap-");
        taskScheduler.initialize();

        AppProperties props = new AppProperties();
        props.getDocument().setSnapshotDebounceMs(80);

        scheduler = new DocumentSnapshotScheduler(
                taskScheduler, documentPersistenceService, collaborationSessionRepository, props);

        sessionId = UUID.randomUUID();
        roomId = UUID.randomUUID();
        when(collaborationSessionRepository.findRoomIdBySessionId(sessionId)).thenReturn(Optional.of(roomId));
    }

    @Test
    void debounceCancelsPreviousAndSnapshotsOnce() throws Exception {
        CountDownLatch latch = new CountDownLatch(1);
        doAnswer(inv -> {
            latch.countDown();
            return null;
        }).when(documentPersistenceService).snapshotDocument(eq(roomId), eq(sessionId), eq("index.html"));

        scheduler.scheduleSnapshot(sessionId, "index.html");
        scheduler.scheduleSnapshot(sessionId, "index.html");
        scheduler.scheduleSnapshot(sessionId, "index.html");

        assertThat(latch.await(2, TimeUnit.SECONDS)).isTrue();
        verify(documentPersistenceService, timeout(1000).times(1))
                .snapshotDocument(roomId, sessionId, "index.html");
    }

    @Test
    void flushNowSnapshotsImmediately() {
        scheduler.scheduleSnapshot(sessionId, "style.css");
        scheduler.flushNow(sessionId, "style.css");
        verify(documentPersistenceService, times(1)).snapshotDocument(roomId, sessionId, "style.css");
        assertThat(scheduler.hasPending(sessionId, "style.css")).isFalse();
    }
}
