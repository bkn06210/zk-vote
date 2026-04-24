package com.zkvote.domain.election;

import com.zkvote.domain.election.dto.CreateElectionRequest;
import com.zkvote.domain.election.dto.ElectionResponse;
import com.zkvote.domain.election.dto.StartVotingRequest;
import com.zkvote.global.security.CustomUserDetails;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/elections")
@RequiredArgsConstructor
public class ElectionController {

    private final ElectionService electionService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ElectionResponse> create(
            @Valid @RequestBody CreateElectionRequest request) {
        return ResponseEntity.ok(electionService.create(request));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<ElectionResponse>> getAll() {
        return ResponseEntity.ok(electionService.getAll());
    }

    @GetMapping("/registerable")
    public ResponseEntity<List<ElectionResponse>> getRegisterable(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(electionService.getRegisterable(userDetails.getEmail()));
    }

    @GetMapping("/voting")
    public ResponseEntity<List<ElectionResponse>> getVoting(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(electionService.getVoting(userDetails.getId()));
    }

    @GetMapping("/completed")
    public ResponseEntity<List<ElectionResponse>> getCompleted(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(electionService.getCompleted(userDetails.getId()));
    }

    @PostMapping("/{electionId}/start-voting")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ElectionResponse> startVoting(
            @PathVariable String electionId,
            @Valid @RequestBody StartVotingRequest request) {
        return ResponseEntity.ok(electionService.startVoting(electionId, request));
    }

    @PostMapping("/{electionId}/complete")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ElectionResponse> complete(@PathVariable String electionId) {
        return ResponseEntity.ok(electionService.complete(electionId));
    }
}
