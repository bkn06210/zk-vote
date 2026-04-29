package com.zkvote.domain.zkp;

import com.zkvote.domain.zkp.dto.ProofDataResponse;
import com.zkvote.domain.zkp.dto.SubmitProofRequest;
import com.zkvote.domain.zkp.dto.SubmitProofResponse;
import com.zkvote.global.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/elections")
@RequiredArgsConstructor
public class ZkpController {

    private final ZkpService zkpService;

    @PostMapping("/{electionId}/proof")
    public ResponseEntity<ProofDataResponse> getProofData(
            @PathVariable String electionId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(zkpService.getProofData(electionId, userDetails.getId()));
    }

    @PostMapping("/{electionId}/submit")
    public ResponseEntity<SubmitProofResponse> submitProof(
            @PathVariable String electionId,
            @RequestBody SubmitProofRequest request) {
        return ResponseEntity.ok(zkpService.submitProof(electionId, request));
    }
}
