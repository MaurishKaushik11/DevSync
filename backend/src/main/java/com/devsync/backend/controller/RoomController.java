package com.devsync.backend.controller;

import com.devsync.backend.dto.auth.GuestJoinRequest;
import com.devsync.backend.dto.auth.GuestJoinResponse;
import com.devsync.backend.dto.room.*;
import com.devsync.backend.security.AuthPrincipal;
import com.devsync.backend.service.RoomService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/rooms")
public class RoomController {

    private final RoomService roomService;

    public RoomController(RoomService roomService) {
        this.roomService = roomService;
    }

    @PostMapping
    public ResponseEntity<RoomResponse> create(@AuthenticationPrincipal AuthPrincipal principal,
                                               @Valid @RequestBody CreateRoomRequest request) {
        return ResponseEntity.ok(roomService.createRoom(principal, request));
    }

    @PostMapping("/import")
    public ResponseEntity<RoomResponse> importRepository(@AuthenticationPrincipal AuthPrincipal principal,
                                                         @Valid @RequestBody ImportRoomRequest request) {
        return ResponseEntity.ok(roomService.importRepository(principal, request));
    }

    @GetMapping
    public ResponseEntity<List<RoomResponse>> list(@AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(roomService.listRooms(principal));
    }

    @GetMapping("/{roomId}")
    public ResponseEntity<RoomResponse> get(@AuthenticationPrincipal AuthPrincipal principal,
                                            @PathVariable UUID roomId) {
        return ResponseEntity.ok(roomService.getRoom(principal, roomId));
    }

    @PatchMapping("/{roomId}")
    public ResponseEntity<RoomResponse> rename(@AuthenticationPrincipal AuthPrincipal principal,
                                               @PathVariable UUID roomId,
                                               @Valid @RequestBody RenameRoomRequest request) {
        return ResponseEntity.ok(roomService.renameRoom(principal, roomId, request));
    }

    @DeleteMapping("/{roomId}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal AuthPrincipal principal,
                                       @PathVariable UUID roomId) {
        roomService.deleteRoom(principal, roomId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/join/{shareId}")
    public ResponseEntity<GuestJoinResponse> join(@PathVariable String shareId,
                                                  @Valid @RequestBody GuestJoinRequest request) {
        return ResponseEntity.ok(roomService.joinByShareId(shareId, request));
    }

    @GetMapping("/{roomId}/files/{fileId}/content")
    public ResponseEntity<FileContentResponse> getFileContent(@AuthenticationPrincipal AuthPrincipal principal,
                                                              @PathVariable UUID roomId,
                                                              @PathVariable UUID fileId) {
        return ResponseEntity.ok(roomService.getFileContent(principal, roomId, fileId));
    }

    @PostMapping("/{roomId}/files/{fileId}/save")
    public ResponseEntity<Void> saveFile(@AuthenticationPrincipal AuthPrincipal principal,
                                         @PathVariable UUID roomId,
                                         @PathVariable UUID fileId,
                                         @Valid @RequestBody SaveFileRequest request) {
        roomService.saveFile(principal, roomId, fileId, request);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{roomId}/end")
    public ResponseEntity<Void> end(@AuthenticationPrincipal AuthPrincipal principal,
                                    @PathVariable UUID roomId) {
        roomService.endSession(principal, roomId);
        return ResponseEntity.ok().build();
    }
}
