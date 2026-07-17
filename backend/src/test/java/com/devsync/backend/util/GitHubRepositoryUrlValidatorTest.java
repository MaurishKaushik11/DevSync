package com.devsync.backend.util;

import com.devsync.backend.exception.ApiException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class GitHubRepositoryUrlValidatorTest {

    @Test
    void acceptsCanonicalHttpsOwnerRepo() {
        var parsed = GitHubRepositoryUrlValidator.parse("https://github.com/octocat/Hello-World");
        assertThat(parsed.owner()).isEqualTo("octocat");
        assertThat(parsed.repo()).isEqualTo("Hello-World");
        assertThat(parsed.httpsCloneUrl()).isEqualTo("https://github.com/octocat/Hello-World.git");
        assertThat(parsed.defaultRoomName()).isEqualTo("Hello-World");
    }

    @Test
    void acceptsOptionalGitSuffixAndTrailingSlash() {
        var parsed = GitHubRepositoryUrlValidator.parse("https://github.com/octocat/Hello-World.git/");
        assertThat(parsed.repo()).isEqualTo("Hello-World");
        assertThat(parsed.httpsCloneUrl()).isEqualTo("https://github.com/octocat/Hello-World.git");
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "http://github.com/octocat/Hello-World",
            "git://github.com/octocat/Hello-World",
            "ssh://git@github.com/octocat/Hello-World.git",
            "https://user:pass@github.com/octocat/Hello-World",
            "https://github.com/octocat/Hello-World?foo=1",
            "https://github.com/octocat/Hello-World#readme",
            "https://github.com/octocat/Hello-World/tree/main",
            "https://www.github.com/octocat/Hello-World",
            "https://raw.githubusercontent.com/octocat/Hello-World/main/README.md",
            "https://127.0.0.1/octocat/Hello-World",
            "https://localhost/octocat/Hello-World",
            "https://github.evil.com/octocat/Hello-World",
            "https://github.com/octocat",
            "https://github.com/",
            "not-a-url",
            ""
    })
    void rejectsInvalidUrls(String url) {
        assertThatThrownBy(() -> GitHubRepositoryUrlValidator.parse(url))
                .isInstanceOf(ApiException.class);
    }
}
