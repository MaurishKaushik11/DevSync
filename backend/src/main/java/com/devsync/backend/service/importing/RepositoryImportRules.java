package com.devsync.backend.service.importing;

import com.devsync.backend.config.props.AppProperties;
import com.devsync.backend.exception.ApiException;

import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.CharsetDecoder;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.Locale;
import java.util.Set;

/**
 * Shared rules for repository import: skip dirs, path safety, binary/UTF-8 checks,
 * and collaboration classification by size.
 */
public final class RepositoryImportRules {

    private static final Set<String> SKIP_DIR_NAMES = Set.of(
            ".git",
            "node_modules",
            "vendor",
            "dist",
            "build",
            "target",
            "coverage",
            ".next"
    );
    private static final Set<String> SENSITIVE_FILE_NAMES = Set.of(
            "id_rsa",
            "id_ed25519",
            "credentials.json",
            "service-account.json"
    );

    private RepositoryImportRules() {
    }

    public static boolean isSkippedDirectoryName(String name) {
        return name != null && SKIP_DIR_NAMES.contains(name);
    }

    /**
     * Returns a normalized relative path using forward slashes, or null if unsafe.
     */
    public static String safeRelativePath(Path cloneRoot, Path file) {
        if (cloneRoot == null || file == null) {
            return null;
        }
        Path absoluteRoot = cloneRoot.toAbsolutePath().normalize();
        Path absoluteFile = file.toAbsolutePath().normalize();
        if (!absoluteFile.startsWith(absoluteRoot)) {
            return null;
        }
        Path relative = absoluteRoot.relativize(absoluteFile);
        if (relative.getNameCount() == 0) {
            return null;
        }
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < relative.getNameCount(); i++) {
            String part = relative.getName(i).toString();
            if (part.isEmpty() || ".".equals(part) || "..".equals(part) || part.indexOf('\0') >= 0) {
                return null;
            }
            if (i > 0) {
                sb.append('/');
            }
            sb.append(part);
        }
        String path = sb.toString();
        if (path.isBlank() || path.length() > 255) {
            return null;
        }
        return path;
    }

    public static boolean pathContainsSkippedSegment(String relativePath) {
        if (relativePath == null) {
            return true;
        }
        for (String part : relativePath.split("/")) {
            if (isSkippedDirectoryName(part)) {
                return true;
            }
        }
        return isSensitiveFilePath(relativePath);
    }

    public static boolean isSensitiveFilePath(String relativePath) {
        if (relativePath == null || relativePath.isBlank()) {
            return true;
        }
        String[] parts = relativePath.replace('\\', '/').split("/");
        String fileName = parts[parts.length - 1].toLowerCase(Locale.ROOT);
        return fileName.equals(".env")
                || fileName.startsWith(".env.")
                || SENSITIVE_FILE_NAMES.contains(fileName)
                || fileName.endsWith(".pem")
                || fileName.endsWith(".key")
                || fileName.endsWith(".p12")
                || fileName.endsWith(".pfx");
    }

    public static boolean isLikelyBinary(byte[] bytes) {
        if (bytes == null || bytes.length == 0) {
            return false;
        }
        int checkLen = Math.min(bytes.length, 8192);
        for (int i = 0; i < checkLen; i++) {
            if (bytes[i] == 0) {
                return true;
            }
        }
        return false;
    }

    /**
     * Strict UTF-8 decode; optionally strips a leading UTF-8 BOM.
     */
    public static String decodeUtf8Strict(byte[] bytes) {
        if (bytes == null) {
            throw ApiException.badRequest("Empty file content");
        }
        byte[] data = bytes;
        if (data.length >= 3
                && (data[0] & 0xFF) == 0xEF
                && (data[1] & 0xFF) == 0xBB
                && (data[2] & 0xFF) == 0xBF) {
            byte[] withoutBom = new byte[data.length - 3];
            System.arraycopy(data, 3, withoutBom, 0, withoutBom.length);
            data = withoutBom;
        }
        CharsetDecoder decoder = StandardCharsets.UTF_8.newDecoder()
                .onMalformedInput(CodingErrorAction.REPORT)
                .onUnmappableCharacter(CodingErrorAction.REPORT);
        try {
            return decoder.decode(ByteBuffer.wrap(data)).toString();
        } catch (CharacterCodingException e) {
            throw new NonUtf8TextException();
        }
    }

    public static boolean collaborationEnabledForSize(long sizeBytes, long collaborationMaxBytes) {
        return sizeBytes <= collaborationMaxBytes;
    }

    public static String guessLanguage(String relativePath) {
        if (relativePath == null) {
            return "plaintext";
        }
        int dot = relativePath.lastIndexOf('.');
        String ext = dot >= 0 ? relativePath.substring(dot + 1).toLowerCase(Locale.ROOT) : "";
        return switch (ext) {
            case "js", "mjs", "cjs" -> "javascript";
            case "ts", "tsx" -> "typescript";
            case "jsx" -> "javascript";
            case "py" -> "python";
            case "java" -> "java";
            case "kt", "kts" -> "kotlin";
            case "go" -> "go";
            case "rs" -> "rust";
            case "rb" -> "ruby";
            case "php" -> "php";
            case "cs" -> "csharp";
            case "cpp", "cc", "cxx", "hpp", "h", "c" -> "cpp";
            case "html", "htm" -> "html";
            case "css" -> "css";
            case "scss", "sass" -> "scss";
            case "json" -> "json";
            case "yml", "yaml" -> "yaml";
            case "xml" -> "xml";
            case "md", "markdown" -> "markdown";
            case "sql" -> "sql";
            case "sh", "bash", "zsh" -> "shell";
            case "toml" -> "toml";
            case "ini" -> "ini";
            case "gradle" -> "groovy";
            case "swift" -> "swift";
            case "r" -> "r";
            case "dart" -> "dart";
            case "vue" -> "vue";
            case "svelte" -> "svelte";
            default -> "plaintext";
        };
    }

    public static ImportedFile classify(
            String relativePath,
            String content,
            long sizeBytes,
            AppProperties.Import limits) {
        boolean collab = collaborationEnabledForSize(sizeBytes, limits.getCollaborationMaxBytes());
        return new ImportedFile(
                relativePath,
                guessLanguage(relativePath),
                content,
                sizeBytes,
                collab
        );
    }

    /** Marker used by the importer to skip non-UTF-8 files without aborting the whole import. */
    public static final class NonUtf8TextException extends RuntimeException {
        public NonUtf8TextException() {
            super("not utf-8");
        }
    }
}
