package com.zkvote.domain.election.dto;

public record CircuitOptionResponse(
        int merkleTreeDepth,
        int maxCandidates,  // compiled circuit's numCandidates — upper bound for zero-padding
        int maxVoters,      // 2^merkleTreeDepth
        String label
) {}
