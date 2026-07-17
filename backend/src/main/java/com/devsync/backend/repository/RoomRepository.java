package com.devsync.backend.repository;

import com.devsync.backend.entity.Room;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RoomRepository extends JpaRepository<Room, UUID> {
    Optional<Room> findByShareIdAndDeletedFalse(String shareId);

    @Query("""
        SELECT DISTINCT r FROM Room r
        JOIN r.members m
        WHERE m.user.id = :userId AND r.deleted = false
        ORDER BY r.lastActivityAt DESC
        """)
    List<Room> findActiveRoomsForUser(@Param("userId") UUID userId);

    @Query("""
        SELECT r FROM Room r
        LEFT JOIN FETCH r.files
        WHERE r.id = :roomId AND r.deleted = false
        """)
    Optional<Room> findByIdWithFiles(@Param("roomId") UUID roomId);
}
