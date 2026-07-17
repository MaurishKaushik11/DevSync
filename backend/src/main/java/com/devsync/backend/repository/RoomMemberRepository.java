package com.devsync.backend.repository;

import com.devsync.backend.entity.RoomMember;
import com.devsync.backend.entity.RoomMemberRole;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface RoomMemberRepository extends JpaRepository<RoomMember, UUID> {
    Optional<RoomMember> findByRoomIdAndUserId(UUID roomId, UUID userId);
    boolean existsByRoomIdAndUserIdAndRole(UUID roomId, UUID userId, RoomMemberRole role);
}
