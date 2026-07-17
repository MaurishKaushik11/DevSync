package com.devsync.backend.util;

import com.devsync.backend.exception.ApiException;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Strict validation for public HTTPS github.com owner/repo URLs.
 * Rejects credentials, query/fragment, non-HTTPS schemes, and non-github hosts.
 */
public final class GitHubRepositoryUrlValidator {

    private static final Pattern OWNER_REPO = Pattern.compile(
            "^/([A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38})/([A-Za-z0-9._-]{1,100})(?:\\.git)?/?$"
    );
    private static final Pattern IPV4 = Pattern.compile("^\\d{1,3}(\\.\\d{1,3}){3}$");

    private GitHubRepositoryUrlValidator() {
    }

    public record ParsedRepository(String owner, String repo, String httpsCloneUrl) {
        public String defaultRoomName() {
            return repo;
        }
    }

    public static ParsedRepository parse(String rawUrl) {
        if (rawUrl == null || rawUrl.isBlank()) {
            throw ApiException.badRequest("Repository URL is required");
        }
        String trimmed = rawUrl.trim();
        if (trimmed.length() > 512) {
            throw ApiException.badRequest("Repository URL is too long");
        }
        if (trimmed.indexOf('\0') >= 0 || trimmed.indexOf(' ') >= 0) {
            throw ApiException.badRequest("Invalid repository URL");
        }

        final URI uri;
        try {
            uri = new URI(trimmed);
        } catch (URISyntaxException e) {
            throw ApiException.badRequest("Invalid repository URL");
        }

        if (uri.getScheme() == null || !"https".equalsIgnoreCase(uri.getScheme())) {
            throw ApiException.badRequest("Only HTTPS github.com repository URLs are allowed");
        }
        if (uri.getRawUserInfo() != null) {
            throw ApiException.badRequest("Repository URL must not include credentials");
        }
        if (uri.getRawQuery() != null || uri.getRawFragment() != null) {
            throw ApiException.badRequest("Repository URL must not include query or fragment");
        }
        if (uri.getPort() != -1 && uri.getPort() != 443) {
            throw ApiException.badRequest("Invalid repository URL host");
        }

        String host = uri.getHost();
        if (host == null) {
            throw ApiException.badRequest("Invalid repository URL host");
        }
        String hostLower = host.toLowerCase(Locale.ROOT);
        rejectDisallowedHost(hostLower);
        if (!"github.com".equals(hostLower)) {
            throw ApiException.badRequest("Only github.com HTTPS repository URLs are allowed");
        }

        String path = uri.getRawPath();
        if (path == null || path.isBlank()) {
            throw ApiException.badRequest("Repository URL must include owner and repository name");
        }
        Matcher matcher = OWNER_REPO.matcher(path);
        if (!matcher.matches()) {
            throw ApiException.badRequest("Repository URL must be https://github.com/{owner}/{repo}");
        }

        String owner = matcher.group(1);
        String repo = matcher.group(2);
        if (repo.toLowerCase(Locale.ROOT).endsWith(".git")) {
            repo = repo.substring(0, repo.length() - 4);
        }
        if (repo.isBlank() || ".".equals(repo) || "..".equals(repo)) {
            throw ApiException.badRequest("Invalid repository name");
        }

        String cloneUrl = "https://github.com/" + owner + "/" + repo + ".git";
        return new ParsedRepository(owner, repo, cloneUrl);
    }

    private static void rejectDisallowedHost(String hostLower) {
        if ("localhost".equals(hostLower)
                || hostLower.endsWith(".localhost")
                || hostLower.endsWith(".local")
                || hostLower.endsWith(".internal")
                || IPV4.matcher(hostLower).matches()
                || hostLower.contains(":")) {
            throw ApiException.badRequest("Invalid repository URL host");
        }
    }
}
