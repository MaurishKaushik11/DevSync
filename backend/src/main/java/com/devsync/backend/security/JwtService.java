package com.devsync.backend.security;

import com.devsync.backend.entity.RoomMemberRole;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

@Service
public class JwtService {

    public static final String CLAIM_TYPE = "typ";
    public static final String CLAIM_NAME = "name";
    public static final String CLAIM_EMAIL = "email";
    public static final String CLAIM_ROOM = "room";
    public static final String CLAIM_SESSION = "sid";
    public static final String CLAIM_ROLE = "role";
    public static final String TYPE_ACCESS = "access";
    public static final String TYPE_GUEST = "guest";

    private final SecretKey secretKey;
    private final long accessTokenMinutes;
    private final long guestTokenMinutes;

    public JwtService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.access-token-minutes:15}") long accessTokenMinutes,
            @Value("${app.jwt.guest-token-minutes:120}") long guestTokenMinutes) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("JWT_SECRET / app.jwt.secret must be configured");
        }
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < 32) {
            throw new IllegalStateException("JWT_SECRET must be at least 32 bytes");
        }
        this.secretKey = Keys.hmacShaKeyFor(keyBytes);
        this.accessTokenMinutes = accessTokenMinutes;
        this.guestTokenMinutes = guestTokenMinutes;
    }

    public String createAccessToken(UUID userId, String displayName, String email) {
        Instant now = Instant.now();
        Instant exp = now.plusSeconds(accessTokenMinutes * 60);
        return Jwts.builder()
                .subject(userId.toString())
                .claim(CLAIM_TYPE, TYPE_ACCESS)
                .claim(CLAIM_NAME, displayName)
                .claim(CLAIM_EMAIL, email)
                .issuedAt(Date.from(now))
                .expiration(Date.from(exp))
                .signWith(secretKey)
                .compact();
    }

    public String createGuestToken(UUID guestId, String displayName, UUID roomId, UUID sessionId, RoomMemberRole role) {
        Instant now = Instant.now();
        Instant exp = now.plusSeconds(guestTokenMinutes * 60);
        return Jwts.builder()
                .subject(guestId.toString())
                .claim(CLAIM_TYPE, TYPE_GUEST)
                .claim(CLAIM_NAME, displayName)
                .claim(CLAIM_ROOM, roomId.toString())
                .claim(CLAIM_SESSION, sessionId.toString())
                .claim(CLAIM_ROLE, role.name())
                .issuedAt(Date.from(now))
                .expiration(Date.from(exp))
                .signWith(secretKey)
                .compact();
    }

    public AuthPrincipal parsePrincipal(String token) {
        Claims claims = parseClaims(token);
        String type = claims.get(CLAIM_TYPE, String.class);
        UUID subjectId = UUID.fromString(claims.getSubject());
        String name = claims.get(CLAIM_NAME, String.class);

        if (TYPE_GUEST.equals(type)) {
            UUID roomId = UUID.fromString(claims.get(CLAIM_ROOM, String.class));
            UUID sessionId = UUID.fromString(claims.get(CLAIM_SESSION, String.class));
            RoomMemberRole role = RoomMemberRole.valueOf(claims.get(CLAIM_ROLE, String.class));
            return AuthPrincipal.guest(subjectId, name, roomId, sessionId, role);
        }
        if (TYPE_ACCESS.equals(type)) {
            String email = claims.get(CLAIM_EMAIL, String.class);
            return AuthPrincipal.account(subjectId, name, email);
        }
        throw new JwtException("Unsupported token type");
    }

    public Claims parseClaims(String token) {
        try {
            return Jwts.parser()
                    .verifyWith(secretKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (JwtException | IllegalArgumentException e) {
            throw new JwtException("Invalid token", e);
        }
    }
}
