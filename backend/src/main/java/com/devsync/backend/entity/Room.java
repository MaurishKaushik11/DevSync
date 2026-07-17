package com.devsync.backend.entity;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "rooms")
public class Room extends AuditedEntity {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(name = "share_id", nullable = false, length = 32, unique = true)
    private String shareId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "host_user_id", nullable = false)
    private AppUser host;

    @Column(nullable = false)
    private boolean deleted = false;

    @OneToMany(mappedBy = "room", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<RoomFile> files = new ArrayList<>();

    @OneToMany(mappedBy = "room", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<RoomMember> members = new ArrayList<>();

    @OneToMany(mappedBy = "room", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CollaborationSession> sessions = new ArrayList<>();

    @PrePersist
    void ensureId() {
        if (id == null) {
            id = UUID.randomUUID();
        }

    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getShareId() {
        return shareId;
    }

    public void setShareId(String shareId) {
        this.shareId = shareId;
    }

    public AppUser getHost() {
        return host;
    }

    public void setHost(AppUser host) {
        this.host = host;
    }

    public boolean isDeleted() {
        return deleted;
    }

    public void setDeleted(boolean deleted) {
        this.deleted = deleted;
    }

    public List<RoomFile> getFiles() {
        return files;
    }

    public List<RoomMember> getMembers() {
        return members;
    }

    public List<CollaborationSession> getSessions() {
        return sessions;
    }
}
