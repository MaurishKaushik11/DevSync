package com.devsync.backend.repository;

import com.devsync.backend.entity.RoomFile;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RoomFileRepository extends JpaRepository<RoomFile, UUID> {
    List<RoomFile> findByRoomId(UUID roomId);
    Optional<RoomFile> findByIdAndRoomId(UUID id, UUID roomId);
    Optional<RoomFile> findByRoomIdAndName(UUID roomId, String name);
}
