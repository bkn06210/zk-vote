package com.zkvote.domain.voter;

import com.zkvote.domain.voter.dto.BulkRegisterRequest;
import com.zkvote.domain.voter.dto.VoterResponse;
import com.zkvote.global.security.CustomUserDetails;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/elections/{electionId}/voters")
@RequiredArgsConstructor
public class VoterController {

    private final VoterService voterService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<VoterResponse>> bulkRegister(
            @PathVariable String electionId,
            @Valid @RequestBody BulkRegisterRequest request) {
        return ResponseEntity.ok(voterService.bulkRegister(electionId, request));
    }

    @PostMapping("/register")
    public ResponseEntity<VoterResponse> selfRegister(
            @PathVariable String electionId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(voterService.selfRegister(electionId, userDetails.getId()));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<VoterResponse>> getVoters(
            @PathVariable String electionId) {
        return ResponseEntity.ok(voterService.getVoters(electionId));
    }
}
