package com.devsync.backend;

import com.devsync.backend.config.TestRedisConfig;
import com.devsync.backend.entity.RoomMember;
import com.devsync.backend.entity.RoomMemberRole;
import com.devsync.backend.repository.AppUserRepository;
import com.devsync.backend.repository.RoomMemberRepository;
import com.devsync.backend.repository.RoomRepository;
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
class RoomApiIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private RoomRepository roomRepository;
    @Autowired private RoomMemberRepository roomMemberRepository;
    @Autowired private AppUserRepository appUserRepository;

    @Test
    void hostGuestAndViewerAuthorization() throws Exception {
        String hostToken = signupAndAccess("host@example.com", "Host User");
        String viewerToken = signupAndAccess("viewer@example.com", "Viewer User");

        MvcResult create = mockMvc.perform(post("/api/rooms")
                        .header("Authorization", "Bearer " + hostToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Demo Room\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.shareId").isNotEmpty())
                .andExpect(jsonPath("$.activeSessionId").isNotEmpty())
                .andExpect(jsonPath("$.role").value("HOST"))
                .andExpect(jsonPath("$.files.length()").value(3))
                .andReturn();

        JsonNode room = objectMapper.readTree(create.getResponse().getContentAsString());
        String roomId = room.get("id").asText();
        String shareId = room.get("shareId").asText();
        String fileId = room.get("files").get(0).get("id").asText();

        // Guest join without account
        MvcResult guestJoin = mockMvc.perform(post("/api/rooms/join/" + shareId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"displayName\":\"Guest One\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.guestAccessToken").isNotEmpty())
                .andExpect(jsonPath("$.guest.id").isNotEmpty())
                .andExpect(jsonPath("$.guest.role").value("EDITOR"))
                .andExpect(jsonPath("$.room.id").value(roomId))
                .andReturn();

        JsonNode guestBody = objectMapper.readTree(guestJoin.getResponse().getContentAsString());
        String guestToken = guestBody.get("guestAccessToken").asText();

        // Guest can save (EDITOR)
        mockMvc.perform(post("/api/rooms/" + roomId + "/files/" + fileId + "/save")
                        .header("Authorization", "Bearer " + guestToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"<!-- guest edit -->\"}"))
                .andExpect(status().isOk());

        // Add viewer membership
        UUID roomUuid = UUID.fromString(roomId);
        var viewerUser = appUserRepository.findByEmailNormalized("viewer@example.com").orElseThrow();
        RoomMember member = new RoomMember();
        member.setRoom(roomRepository.findById(roomUuid).orElseThrow());
        member.setUser(viewerUser);
        member.setRole(RoomMemberRole.VIEWER);
        roomMemberRepository.save(member);

        // VIEWER denied writes
        mockMvc.perform(post("/api/rooms/" + roomId + "/files/" + fileId + "/save")
                        .header("Authorization", "Bearer " + viewerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"nope\"}"))
                .andExpect(status().isForbidden());

        // VIEWER denied rename/delete/end
        mockMvc.perform(patch("/api/rooms/" + roomId)
                        .header("Authorization", "Bearer " + viewerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Hacked\"}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(delete("/api/rooms/" + roomId)
                        .header("Authorization", "Bearer " + viewerToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/rooms/" + roomId + "/end")
                        .header("Authorization", "Bearer " + viewerToken))
                .andExpect(status().isForbidden());

        // Host can rename
        mockMvc.perform(patch("/api/rooms/" + roomId)
                        .header("Authorization", "Bearer " + hostToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Renamed Room\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Renamed Room"));

        // Host and guest can load file content; outsider cannot
        mockMvc.perform(get("/api/rooms/" + roomId + "/files/" + fileId + "/content")
                        .header("Authorization", "Bearer " + hostToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isString());

        mockMvc.perform(get("/api/rooms/" + roomId + "/files/" + fileId + "/content")
                        .header("Authorization", "Bearer " + guestToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isString());

        mockMvc.perform(get("/api/rooms/" + roomId + "/files/" + fileId + "/content")
                        .header("Authorization", "Bearer " + viewerToken))
                .andExpect(status().isOk());

        String strangerToken = signupAndAccess("stranger@example.com", "Stranger");
        mockMvc.perform(get("/api/rooms/" + roomId + "/files/" + fileId + "/content")
                        .header("Authorization", "Bearer " + strangerToken))
                .andExpect(status().isForbidden());

        // Import requires account auth; guests and anonymous are rejected
        mockMvc.perform(post("/api/rooms/import")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"repositoryUrl\":\"https://github.com/octocat/Hello-World\"}"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/rooms/import")
                        .header("Authorization", "Bearer " + guestToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"repositoryUrl\":\"https://github.com/octocat/Hello-World\"}"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/rooms/import")
                        .header("Authorization", "Bearer " + hostToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"repositoryUrl\":\"http://github.com/octocat/Hello-World\"}"))
                .andExpect(status().isBadRequest());

        // Unauthenticated session create blocked
        mockMvc.perform(post("/api/sessions/create")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"creatorName\":\"Anon\"}"))
                .andExpect(status().isUnauthorized());

        // Guest rows not created for AppUser/RoomMember
        assertThat(roomMemberRepository.findByRoomIdAndUserId(roomUuid, UUID.fromString(guestBody.get("guest").get("id").asText())))
                .isEmpty();
    }

    private String signupAndAccess(String email, String name) throws Exception {
        String password = UUID.randomUUID() + "Aa1!";
        MvcResult result = mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"%s","displayName":"%s"}
                                """.formatted(email, password, name)))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("accessToken").asText();
    }
}
