package com.devsync.backend.security;

import com.devsync.backend.entity.RoomMemberRole;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

public class AuthPrincipal implements UserDetails {

    private final UUID subjectId;
    private final PrincipalType type;
    private final String displayName;
    private final String email;
    private final UUID roomId;
    private final UUID sessionId;
    private final RoomMemberRole guestRole;

    private AuthPrincipal(UUID subjectId, PrincipalType type, String displayName, String email,
                          UUID roomId, UUID sessionId, RoomMemberRole guestRole) {
        this.subjectId = subjectId;
        this.type = type;
        this.displayName = displayName;
        this.email = email;
        this.roomId = roomId;
        this.sessionId = sessionId;
        this.guestRole = guestRole;
    }

    public static AuthPrincipal account(UUID userId, String displayName, String email) {
        return new AuthPrincipal(userId, PrincipalType.ACCOUNT, displayName, email, null, null, null);
    }

    public static AuthPrincipal guest(UUID guestId, String displayName, UUID roomId, UUID sessionId, RoomMemberRole role) {
        return new AuthPrincipal(guestId, PrincipalType.GUEST, displayName, null, roomId, sessionId, role);
    }

    public UUID getSubjectId() {
        return subjectId;
    }

    public PrincipalType getType() {
        return type;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getEmail() {
        return email;
    }

    public UUID getRoomId() {
        return roomId;
    }

    public UUID getSessionId() {
        return sessionId;
    }

    public RoomMemberRole getGuestRole() {
        return guestRole;
    }

    public boolean isAccount() {
        return type == PrincipalType.ACCOUNT;
    }

    public boolean isGuest() {
        return type == PrincipalType.GUEST;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        if (isGuest()) {
            return List.of(new SimpleGrantedAuthority("ROLE_GUEST"),
                    new SimpleGrantedAuthority("ROLE_" + (guestRole != null ? guestRole.name() : "EDITOR")));
        }
        return List.of(new SimpleGrantedAuthority("ROLE_USER"));
    }

    @Override
    public String getPassword() {
        return "";
    }

    @Override
    public String getUsername() {
        return subjectId.toString();
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof AuthPrincipal that)) return false;
        return Objects.equals(subjectId, that.subjectId) && type == that.type;
    }

    @Override
    public int hashCode() {
        return Objects.hash(subjectId, type);
    }
}
