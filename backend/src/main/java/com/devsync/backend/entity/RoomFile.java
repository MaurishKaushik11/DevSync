package com.devsync.backend.entity;

import jakarta.persistence.*;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

@Entity
@Table(name = "room_files")
public class RoomFile extends AuditedEntity {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(length = 64)
    private String language;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content = "";

    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes = 0L;

    @Column(name = "collaboration_enabled", nullable = false)
    private boolean collaborationEnabled = true;

    @PrePersist
    void ensureId() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (sizeBytes <= 0 && content != null) {
            sizeBytes = content.getBytes(StandardCharsets.UTF_8).length;
        }
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public Room getRoom() {
        return room;
    }

    public void setRoom(Room room) {
        this.room = room;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content != null ? content : "";
        this.sizeBytes = this.content.getBytes(StandardCharsets.UTF_8).length;
    }

    public long getSizeBytes() {
        return sizeBytes;
    }

    public void setSizeBytes(long sizeBytes) {
        this.sizeBytes = sizeBytes;
    }

    public boolean isCollaborationEnabled() {
        return collaborationEnabled;
    }

    public void setCollaborationEnabled(boolean collaborationEnabled) {
        this.collaborationEnabled = collaborationEnabled;
    }
}
