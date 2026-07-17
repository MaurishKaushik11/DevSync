package com.devsync.backend.service;

import com.devsync.backend.dto.auth.AuthResponse;
import com.devsync.backend.dto.auth.LoginRequest;
import com.devsync.backend.dto.auth.SignupRequest;
import com.devsync.backend.dto.auth.UserResponse;
import com.devsync.backend.entity.AppUser;
import com.devsync.backend.entity.AuthProvider;
import com.devsync.backend.entity.RefreshToken;
import com.devsync.backend.exception.ApiException;
import com.devsync.backend.repository.AppUserRepository;
import com.devsync.backend.repository.RefreshTokenRepository;
import com.devsync.backend.security.JwtService;
import com.devsync.backend.util.SecurityUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

@Service
public class AuthService {

    private final AppUserRepository appUserRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final long refreshTokenDays;
    private final long accessTokenMinutes;

    public AuthService(
            AppUserRepository appUserRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            @Value("${app.refresh-token.days:14}") long refreshTokenDays,
            @Value("${app.jwt.access-token-minutes:15}") long accessTokenMinutes) {
        this.appUserRepository = appUserRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.refreshTokenDays = refreshTokenDays;
        this.accessTokenMinutes = accessTokenMinutes;
    }

    @Transactional
    public AuthResult signup(SignupRequest request) {
        String email = SecurityUtils.normalizeEmail(request.email());
        String displayName = SecurityUtils.normalizeDisplayName(request.displayName());
        if (!SecurityUtils.isValidEmail(email)) {
            throw ApiException.badRequest("Invalid email");
        }
        if (!SecurityUtils.isValidDisplayName(displayName)) {
            throw ApiException.badRequest("Invalid display name");
        }
        if (request.password() == null || request.password().length() < 8) {
            throw ApiException.badRequest("Password must be at least 8 characters");
        }
        if (appUserRepository.existsByEmailNormalized(email)) {
            throw ApiException.conflict("Email already registered");
        }

        AppUser user = new AppUser();
        user.setEmail(email);
        user.setEmailNormalized(email);
        user.setDisplayName(displayName);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setAuthProvider(AuthProvider.LOCAL);
        appUserRepository.save(user);

        return issueTokens(user);
    }

    @Transactional
    public AuthResult login(LoginRequest request) {
        String email = SecurityUtils.normalizeEmail(request.email());
        Optional<AppUser> userOpt = appUserRepository.findByEmailNormalized(email);
        if (userOpt.isEmpty()
                || userOpt.get().getPasswordHash() == null
                || !passwordEncoder.matches(request.password(), userOpt.get().getPasswordHash())) {
            throw ApiException.unauthorized("Invalid email or password");
        }
        AppUser user = userOpt.get();
        user.touchActivity();
        return issueTokens(user);
    }

    @Transactional
    public AuthResult refresh(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw ApiException.unauthorized("Missing refresh token");
        }
        String hash = SecurityUtils.sha256Hex(rawRefreshToken);
        RefreshToken existing = refreshTokenRepository.findByTokenHashAndRevokedFalse(hash)
                .orElseThrow(() -> ApiException.unauthorized("Invalid refresh token"));
        if (existing.isExpired()) {
            existing.setRevoked(true);
            throw ApiException.unauthorized("Refresh token expired");
        }

        existing.setRevoked(true);
        AppUser user = existing.getUser();
        AuthResult result = issueTokens(user);
        existing.setReplacedByTokenHash(SecurityUtils.sha256Hex(result.rawRefreshToken()));
        return result;
    }

    @Transactional
    public void logout(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            return;
        }
        String hash = SecurityUtils.sha256Hex(rawRefreshToken);
        refreshTokenRepository.findByTokenHashAndRevokedFalse(hash).ifPresent(token -> {
            token.setRevoked(true);
            token.touchActivity();
        });
    }

    @Transactional(readOnly = true)
    public UserResponse me(java.util.UUID userId) {
        AppUser user = appUserRepository.findById(userId)
                .orElseThrow(() -> ApiException.unauthorized("User not found"));
        return toUserResponse(user);
    }

    @Transactional
    public AuthResult upsertGithubUser(String githubId, String email, String displayName, String avatarUrl) {
        if (githubId == null || githubId.isBlank()) {
            throw ApiException.badRequest("GitHub id required");
        }
        Optional<AppUser> byGithub = appUserRepository.findByGithubId(githubId);
        AppUser user;
        if (byGithub.isPresent()) {
            user = byGithub.get();
            if (displayName != null && SecurityUtils.isValidDisplayName(displayName)) {
                user.setDisplayName(SecurityUtils.normalizeDisplayName(displayName));
            }
            if (avatarUrl != null) {
                user.setAvatarUrl(avatarUrl);
            }
            if (email != null && SecurityUtils.isValidEmail(email)) {
                String normalized = SecurityUtils.normalizeEmail(email);
                if (!normalized.equals(user.getEmailNormalized())
                        && !appUserRepository.existsByEmailNormalized(normalized)) {
                    user.setEmail(normalized);
                    user.setEmailNormalized(normalized);
                }
            }
            user.touchActivity();
        } else {
            String normalizedEmail = email != null && SecurityUtils.isValidEmail(email)
                    ? SecurityUtils.normalizeEmail(email)
                    : ("github-" + githubId + "@users.noreply.github.com");
            Optional<AppUser> byEmail = appUserRepository.findByEmailNormalized(normalizedEmail);
            if (byEmail.isPresent()) {
                user = byEmail.get();
                user.setGithubId(githubId);
                user.setAuthProvider(AuthProvider.GITHUB);
                if (avatarUrl != null) {
                    user.setAvatarUrl(avatarUrl);
                }
                user.touchActivity();
            } else {
                user = new AppUser();
                user.setGithubId(githubId);
                user.setEmail(normalizedEmail);
                user.setEmailNormalized(normalizedEmail);
                user.setDisplayName(SecurityUtils.isValidDisplayName(displayName)
                        ? SecurityUtils.normalizeDisplayName(displayName)
                        : ("github-" + githubId));
                user.setAvatarUrl(avatarUrl);
                user.setAuthProvider(AuthProvider.GITHUB);
                appUserRepository.save(user);
            }
        }
        return issueTokens(user);
    }

    private AuthResult issueTokens(AppUser user) {
        String accessToken = jwtService.createAccessToken(user.getId(), user.getDisplayName(), user.getEmail());
        String rawRefresh = SecurityUtils.generateOpaqueToken();
        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUser(user);
        refreshToken.setTokenHash(SecurityUtils.sha256Hex(rawRefresh));
        refreshToken.setExpiresAt(Instant.now().plus(refreshTokenDays, ChronoUnit.DAYS));
        refreshTokenRepository.save(refreshToken);

        AuthResponse response = new AuthResponse(
                accessToken,
                "Bearer",
                accessTokenMinutes * 60,
                toUserResponse(user)
        );
        return new AuthResult(response, rawRefresh);
    }

    public static UserResponse toUserResponse(AppUser user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getDisplayName(),
                user.getAuthProvider().name(),
                user.getAvatarUrl()
        );
    }

    public record AuthResult(AuthResponse response, String rawRefreshToken) {
    }
}
