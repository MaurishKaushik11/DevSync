package com.devsync.backend;

import com.devsync.backend.config.TestRedisConfig;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestRedisConfig.class)
class AuthApiIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void signupLoginRefreshRotationAndMe() throws Exception {
        String email = "alice@example.com";
        String password = UUID.randomUUID() + "Aa1!";
        String incorrectPassword = UUID.randomUUID() + "Bb2!";
        String signupBody = """
                {"email":"%s","password":"%s","displayName":"Alice"}
                """.formatted(email, password);

        MvcResult signup = mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(signupBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.user.email").value(email))
                .andReturn();

        String refresh1 = extractRefreshCookie(signup);
        assertThat(refresh1).isNotBlank();
        String access1 = objectMapper.readTree(signup.getResponse().getContentAsString()).get("accessToken").asText();

        mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + access1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value("Alice"));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"%s"}
                                """.formatted(email, incorrectPassword)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid email or password"));

        MvcResult refreshResult = mockMvc.perform(post("/api/auth/refresh")
                        .cookie(new jakarta.servlet.http.Cookie("refresh_token", refresh1)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andReturn();

        String refresh2 = extractRefreshCookie(refreshResult);
        assertThat(refresh2).isNotBlank();
        assertThat(refresh2).isNotEqualTo(refresh1);

        // Old refresh token should no longer work (rotated/revoked)
        mockMvc.perform(post("/api/auth/refresh")
                        .cookie(new jakarta.servlet.http.Cookie("refresh_token", refresh1)))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/auth/logout")
                        .cookie(new jakarta.servlet.http.Cookie("refresh_token", refresh2)))
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/api/auth/refresh")
                        .cookie(new jakarta.servlet.http.Cookie("refresh_token", refresh2)))
                .andExpect(status().isUnauthorized());
    }

    private String extractRefreshCookie(MvcResult result) {
        for (String header : result.getResponse().getHeaders("Set-Cookie")) {
            if (header != null && header.startsWith("refresh_token=")) {
                return header.substring("refresh_token=".length()).split(";", 2)[0];
            }
        }
        var cookies = result.getResponse().getCookies();
        for (var cookie : cookies) {
            if ("refresh_token".equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }
}
