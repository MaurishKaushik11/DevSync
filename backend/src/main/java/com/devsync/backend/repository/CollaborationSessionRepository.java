package com.devsync.backend.repository;

import com.devsync.backend.entity.CollaborationSession;
import com.devsync.backend.entity.SessionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;
import java.util.UUID;

public interface CollaborationSessionRepository extends JpaRepository<CollaborationSession, UUID> {
    Optional<CollaborationSession> findFirstByRoomIdAndStatusOrderByStartedAtDesc(UUID roomId, SessionStatus status);
    Optional<CollaborationSession> findByIdAndStatus(UUID id, SessionStatus status);

    @Query("SELECT s.room.id FROM CollaborationSession s WHERE s.id = :sessionId")
    Optional<UUID> findRoomIdBySessionId(@Param("sessionId") UUID sessionId);
}
