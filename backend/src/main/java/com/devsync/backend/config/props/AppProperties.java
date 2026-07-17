package com.devsync.backend.config.props;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public class AppProperties {
    private String frontendUrl = "http://localhost:5173";
    private String allowedOrigins = "http://localhost:5173";
    private Document document = new Document();
    private Import importSettings = new Import();
    private OAuth2 oauth2 = new OAuth2();

    public String getFrontendUrl() {
        return frontendUrl;
    }

    public void setFrontendUrl(String frontendUrl) {
        this.frontendUrl = frontendUrl;
    }

    public String getAllowedOrigins() {
        return allowedOrigins;
    }

    public void setAllowedOrigins(String allowedOrigins) {
        this.allowedOrigins = allowedOrigins;
    }

    public Document getDocument() {
        return document;
    }

    public void setDocument(Document document) {
        this.document = document;
    }

    public Import getImport() {
        return importSettings;
    }

    public void setImport(Import importSettings) {
        this.importSettings = importSettings;
    }

    public OAuth2 getOauth2() {
        return oauth2;
    }

    public void setOauth2(OAuth2 oauth2) {
        this.oauth2 = oauth2;
    }

    public String[] allowedOriginList() {
        if (allowedOrigins == null || allowedOrigins.isBlank()) {
            return new String[0];
        }
        return java.util.Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .filter(s -> !"*".equals(s))
                .toArray(String[]::new);
    }

    public static class Document {
        private long snapshotDebounceMs = 3000;
        private int maxContentChars = 500_000;

        public long getSnapshotDebounceMs() {
            return snapshotDebounceMs;
        }

        public void setSnapshotDebounceMs(long snapshotDebounceMs) {
            this.snapshotDebounceMs = snapshotDebounceMs;
        }

        public int getMaxContentChars() {
            return maxContentChars;
        }

        public void setMaxContentChars(int maxContentChars) {
            this.maxContentChars = maxContentChars;
        }
    }

    public static class Import {
        /** Max bytes for a single imported file (default 25 MiB). */
        private long maxFileBytes = 25L * 1024 * 1024;
        /** Files larger than this are imported read-only (default 1 MiB). */
        private long collaborationMaxBytes = 1024L * 1024;
        /** Cap on total imported bytes per room (default 100 MiB). */
        private long maxTotalBytes = 100L * 1024 * 1024;
        /** Cap on number of imported files (default 2000). */
        private int maxFiles = 2000;

        public long getMaxFileBytes() {
            return maxFileBytes;
        }

        public void setMaxFileBytes(long maxFileBytes) {
            this.maxFileBytes = maxFileBytes;
        }

        public long getCollaborationMaxBytes() {
            return collaborationMaxBytes;
        }

        public void setCollaborationMaxBytes(long collaborationMaxBytes) {
            this.collaborationMaxBytes = collaborationMaxBytes;
        }

        public long getMaxTotalBytes() {
            return maxTotalBytes;
        }

        public void setMaxTotalBytes(long maxTotalBytes) {
            this.maxTotalBytes = maxTotalBytes;
        }

        public int getMaxFiles() {
            return maxFiles;
        }

        public void setMaxFiles(int maxFiles) {
            this.maxFiles = maxFiles;
        }
    }

    public static class OAuth2 {
        private Github github = new Github();

        public Github getGithub() {
            return github;
        }

        public void setGithub(Github github) {
            this.github = github;
        }

        public static class Github {
            private boolean enabled = false;

            public boolean isEnabled() {
                return enabled;
            }

            public void setEnabled(boolean enabled) {
                this.enabled = enabled;
            }
        }
    }
}
