package com.devsync.backend.repository;

import com.devsync.backend.entity.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface AppUserRepository extends JpaRepository<AppUser, UUID> {
    Optional<AppUser> findByEmailNormalized(String emailNormalized);
    Optional<AppUser> findByGithubId(String githubId);
    boolean existsByEmailNormalized(String emailNormalized);
}
