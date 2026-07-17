package com.devsync.backend.util;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;
import java.util.regex.Pattern;

public final class SecurityUtils {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");
    private static final Pattern DISPLAY_NAME_PATTERN = Pattern.compile("^[\\p{L}\\p{N} ._'-]{2,100}$");

    private SecurityUtils() {
    }

    public static String normalizeEmail(String email) {
        if (email == null) {
            return null;
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }

    public static boolean isValidEmail(String email) {
        if (email == null || email.isBlank() || email.length() > 320) {
            return false;
        }
        return EMAIL_PATTERN.matcher(email.trim()).matches();
    }

    public static String normalizeDisplayName(String displayName) {
        if (displayName == null) {
            return null;
        }
        return displayName.trim().replaceAll("\\s+", " ");
    }

    public static boolean isValidDisplayName(String displayName) {
        if (displayName == null) {
            return false;
        }
        String normalized = normalizeDisplayName(displayName);
        return DISPLAY_NAME_PATTERN.matcher(normalized).matches();
    }

    public static String generateOpaqueToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public static String sha256Hex(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    public static String generateShareId() {
        byte[] bytes = new byte[9];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
