package com.devsync.backend.service.importing;

import com.devsync.backend.config.props.AppProperties;
import com.devsync.backend.exception.ApiException;
import org.eclipse.jgit.api.Git;
import org.eclipse.jgit.api.errors.GitAPIException;
import org.eclipse.jgit.api.errors.TransportException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.FileVisitResult;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.SimpleFileVisitor;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Stream;

/**
 * Clones a public GitHub repository with JGit (shallow depth 1) and imports text files.
 * Never shells out. Does not log file contents or tokens.
 */
@Service
public class RepositoryImportService {

    private static final Logger log = LoggerFactory.getLogger(RepositoryImportService.class);

    private final AppProperties appProperties;

    public RepositoryImportService(AppProperties appProperties) {
        this.appProperties = appProperties;
    }

    public List<ImportedFile> importPublicRepository(String httpsCloneUrl) {
        AppProperties.Import limits = appProperties.getImport();
        Path tempDir = null;
        try {
            tempDir = Files.createTempDirectory("devsync-import-");
            log.info("Cloning public repository into temporary directory (depth=1)");
            cloneShallow(httpsCloneUrl, tempDir);
            return collectImportableFiles(tempDir, limits);
        } catch (ApiException e) {
            throw e;
        } catch (TransportException e) {
            log.warn("Repository clone transport failed: {}", e.getClass().getSimpleName());
            throw ApiException.badRequest("Unable to clone repository. Only public github.com repositories are supported.");
        } catch (GitAPIException e) {
            log.warn("Repository clone failed: {}", e.getClass().getSimpleName());
            throw ApiException.badRequest("Unable to clone repository");
        } catch (IOException e) {
            log.warn("Repository import I/O failed: {}", e.getClass().getSimpleName());
            throw new ApiException(
                    org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR,
                    "IMPORT_FAILED",
                    "Repository import failed");
        } finally {
            if (tempDir != null) {
                cleanRecursively(tempDir);
            }
        }
    }

    private void cloneShallow(String httpsCloneUrl, Path directory) throws GitAPIException {
        Git.cloneRepository()
                .setURI(httpsCloneUrl)
                .setDirectory(directory.toFile())
                .setCloneAllBranches(false)
                .setDepth(1)
                .setBare(false)
                .call()
                .close();
    }

    List<ImportedFile> collectImportableFiles(Path cloneRoot, AppProperties.Import limits) throws IOException {
        List<ImportedFile> imported = new ArrayList<>();
        long[] totalBytes = {0L};

        Files.walkFileTree(cloneRoot, new SimpleFileVisitor<>() {
            @Override
            public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) {
                if (dir.equals(cloneRoot)) {
                    return FileVisitResult.CONTINUE;
                }
                String name = dir.getFileName() != null ? dir.getFileName().toString() : "";
                if (RepositoryImportRules.isSkippedDirectoryName(name) || Files.isSymbolicLink(dir)) {
                    return FileVisitResult.SKIP_SUBTREE;
                }
                return FileVisitResult.CONTINUE;
            }

            @Override
            public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) {
                try {
                    if (Files.isSymbolicLink(file) || !attrs.isRegularFile()) {
                        return FileVisitResult.CONTINUE;
                    }
                    String relative = RepositoryImportRules.safeRelativePath(cloneRoot, file);
                    if (relative == null || RepositoryImportRules.pathContainsSkippedSegment(relative)) {
                        return FileVisitResult.CONTINUE;
                    }
                    long size = attrs.size();
                    if (size < 0 || size > limits.getMaxFileBytes()) {
                        return FileVisitResult.CONTINUE;
                    }
                    if (imported.size() >= limits.getMaxFiles()) {
                        throw ApiException.badRequest("Repository exceeds maximum importable file count ("
                                + limits.getMaxFiles() + ")");
                    }
                    if (totalBytes[0] + size > limits.getMaxTotalBytes()) {
                        throw ApiException.badRequest("Repository exceeds maximum importable size ("
                                + limits.getMaxTotalBytes() + " bytes)");
                    }

                    byte[] bytes = Files.readAllBytes(file);
                    if (bytes.length != size) {
                        size = bytes.length;
                        if (size > limits.getMaxFileBytes()) {
                            return FileVisitResult.CONTINUE;
                        }
                        if (totalBytes[0] + size > limits.getMaxTotalBytes()) {
                            throw ApiException.badRequest("Repository exceeds maximum importable size ("
                                    + limits.getMaxTotalBytes() + " bytes)");
                        }
                    }
                    if (RepositoryImportRules.isLikelyBinary(bytes)) {
                        return FileVisitResult.CONTINUE;
                    }

                    final String content;
                    try {
                        content = RepositoryImportRules.decodeUtf8Strict(bytes);
                    } catch (RepositoryImportRules.NonUtf8TextException e) {
                        return FileVisitResult.CONTINUE;
                    }

                    ImportedFile item = RepositoryImportRules.classify(relative, content, size, limits);
                    imported.add(item);
                    totalBytes[0] += size;
                } catch (ApiException e) {
                    throw e;
                } catch (IOException e) {
                    log.debug("Skipping unreadable file during import");
                }
                return FileVisitResult.CONTINUE;
            }
        });

        if (imported.isEmpty()) {
            throw ApiException.badRequest("No importable text files found in repository");
        }
        imported.sort(Comparator.comparing(ImportedFile::relativePath));
        return imported;
    }

    static void cleanRecursively(Path root) {
        if (root == null || !Files.exists(root)) {
            return;
        }
        try (Stream<Path> walk = Files.walk(root)) {
            walk.sorted(Comparator.reverseOrder()).forEach(path -> {
                try {
                    Files.deleteIfExists(path);
                } catch (IOException e) {
                    // Best-effort cleanup; avoid leaking paths in logs
                }
            });
        } catch (IOException e) {
            // Best-effort cleanup
        }
    }
}
