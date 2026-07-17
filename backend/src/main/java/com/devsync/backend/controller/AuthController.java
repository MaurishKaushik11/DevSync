package com.devsync.backend.controller;

import com.devsync.backend.dto.auth.*;
import com.devsync.backend.security.AuthPrincipal;
import com.devsync.backend.security.RefreshTokenCookieService;
import com.devsync.backend.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final RefreshTokenCookieService refreshTokenCookieService;

    public AuthController(AuthService authService, RefreshTokenCookieService refreshTokenCookieService) {
        this.authService = authService;
        this.refreshTokenCookieService = refreshTokenCookieService;
    }

    @PostMapping("/signup")
    public ResponseEntity<AuthResponse> signup(@Valid @RequestBody SignupRequest request,
                                               HttpServletResponse response) {
        AuthService.AuthResult result = authService.signup(request);
        refreshTokenCookieService.setRefreshCookie(response, result.rawRefreshToken());
        return ResponseEntity.ok(result.response());
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request,
                                              HttpServletResponse response) {
        AuthService.AuthResult result = authService.login(request);
        refreshTokenCookieService.setRefreshCookie(response, result.rawRefreshToken());
        return ResponseEntity.ok(result.response());
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(HttpServletRequest request, HttpServletResponse response) {
        String raw = refreshTokenCookieService.readRefreshCookie(request);
        AuthService.AuthResult result = authService.refresh(raw);
        refreshTokenCookieService.setRefreshCookie(response, result.rawRefreshToken());
        return ResponseEntity.ok(result.response());
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request, HttpServletResponse response) {
        String raw = refreshTokenCookieService.readRefreshCookie(request);
        authService.logout(raw);
        refreshTokenCookieService.clearRefreshCookie(response);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponse> me(@AuthenticationPrincipal AuthPrincipal principal) {
        if (principal == null || !principal.isAccount()) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(authService.me(principal.getSubjectId()));
    }
}
