package com.zkvote.domain.zkp.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record ProofDataResponse(
        @JsonProperty("user_secret") String userSecret,
        String root,
        List<String> pathElements,
        List<Integer> pathIndices,
        String submissionTicket,
        int circuitNumCandidates  // compiled circuit size — frontend pads vote array to this length
) {}
