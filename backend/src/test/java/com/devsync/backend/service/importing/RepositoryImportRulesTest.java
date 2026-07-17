package com.devsync.backend.service.importing;

import com.devsync.backend.config.props.AppProperties;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

class RepositoryImportRulesTest {

    @TempDir
    Path tempDir;

    @Test
    void collaborationClassificationUsesConfiguredThreshold() {
        AppProperties.Import limits = new AppProperties.Import();
        limits.setCollaborationMaxBytes(1024);

        assertThat(RepositoryImportRules.collaborationEnabledForSize(1024, 1024)).isTrue();
        assertThat(RepositoryImportRules.collaborationEnabledForSize(1025, 1024)).isFalse();

        ImportedFile small = RepositoryImportRules.classify("src/a.txt", "hi", 2, limits);
        assertThat(small.collaborationEnabled()).isTrue();

        ImportedFile large = RepositoryImportRules.classify("src/b.txt", "x".repeat(2000), 2000, limits);
        assertThat(large.collaborationEnabled()).isFalse();
        assertThat(large.language()).isEqualTo("plaintext");
    }

    @Test
    void utf8StrictAcceptsBomAndRejectsInvalid() {
        byte[] withBom = new byte[] {(byte) 0xEF, (byte) 0xBB, (byte) 0xBF, 'o', 'k'};
        assertThat(RepositoryImportRules.decodeUtf8Strict(withBom)).isEqualTo("ok");

        byte[] invalid = new byte[] {(byte) 0xFF, (byte) 0xFE, 0x00};
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> RepositoryImportRules.decodeUtf8Strict(invalid))
                .isInstanceOf(RepositoryImportRules.NonUtf8TextException.class);
    }

    @Test
    void detectsBinaryAndSkippedDirs() {
        assertThat(RepositoryImportRules.isLikelyBinary(new byte[] {1, 2, 0, 3})).isTrue();
        assertThat(RepositoryImportRules.isLikelyBinary("hello".getBytes(StandardCharsets.UTF_8))).isFalse();
        assertThat(RepositoryImportRules.isSkippedDirectoryName("node_modules")).isTrue();
        assertThat(RepositoryImportRules.isSkippedDirectoryName("src")).isFalse();
    }

    @Test
    void skipsCredentialFilesBeforeImport() {
        assertThat(RepositoryImportRules.pathContainsSkippedSegment(".env")).isTrue();
        assertThat(RepositoryImportRules.pathContainsSkippedSegment("config/.env.production")).isTrue();
        assertThat(RepositoryImportRules.pathContainsSkippedSegment("certs/private.pem")).isTrue();
        assertThat(RepositoryImportRules.pathContainsSkippedSegment("credentials.json")).isTrue();
        assertThat(RepositoryImportRules.pathContainsSkippedSegment("src/config.ts")).isFalse();
    }

    @Test
    void rejectsUnsafeRelativePaths() throws Exception {
        Path root = tempDir.resolve("repo");
        Files.createDirectories(root);
        Path outside = tempDir.resolve("outside.txt");
        Files.writeString(outside, "secret");

        assertThat(RepositoryImportRules.safeRelativePath(root, outside)).isNull();

        Path nested = root.resolve("src").resolve("Main.java");
        Files.createDirectories(nested.getParent());
        Files.writeString(nested, "class Main {}");
        assertThat(RepositoryImportRules.safeRelativePath(root, nested)).isEqualTo("src/Main.java");
    }

    @Test
    void collectImportableFilesSkipsBinariesAndLargeFiles() throws Exception {
        Path root = tempDir.resolve("clone");
        Files.createDirectories(root.resolve("src"));
        Files.createDirectories(root.resolve("node_modules/pkg"));
        Files.writeString(root.resolve("src/app.js"), "console.log(1);");
        Files.write(root.resolve("src/blob.bin"), new byte[] {0, 1, 2, 3});
        Files.writeString(root.resolve("node_modules/pkg/index.js"), "skipped");

        AppProperties.Import limits = new AppProperties.Import();
        limits.setMaxFileBytes(100);
        limits.setCollaborationMaxBytes(50);
        limits.setMaxTotalBytes(10_000);
        limits.setMaxFiles(100);

        Files.write(root.resolve("src/big.txt"), "x".repeat(101).getBytes(StandardCharsets.UTF_8));

        RepositoryImportService service = new RepositoryImportService(new AppProperties());
        var imported = service.collectImportableFiles(root, limits);

        assertThat(imported).hasSize(1);
        assertThat(imported.get(0).relativePath()).isEqualTo("src/app.js");
        assertThat(imported.get(0).collaborationEnabled()).isTrue();
        assertThat(imported.get(0).language()).isEqualTo("javascript");
    }
}
