package com.zkvote.domain.election.dto;

import com.zkvote.domain.election.Election;
import com.zkvote.domain.election.ElectionStatus;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
public class ElectionResponse {

    private final String id;
    private final String name;
    private final int merkleTreeDepth;
    private final List<String> candidates;
    private final int numCandidates;
    private final ElectionStatus status;
    private final LocalDateTime registrationStartTime;
    private final LocalDateTime registrationEndTime;
    private final LocalDateTime votingStartTime;
    private final LocalDateTime votingEndTime;
    private final String contractAddress;
    private final String merkleRoot;
    private final LocalDateTime createdAt;

    private ElectionResponse(Election election) {
        this.id = election.getId();
        this.name = election.getName();
        this.merkleTreeDepth = election.getMerkleTreeDepth();
        this.candidates = election.getCandidates();
        this.numCandidates = election.getNumCandidates();
        this.status = election.getStatus();
        this.registrationStartTime = election.getRegistrationStartTime();
        this.registrationEndTime = election.getRegistrationEndTime();
        this.votingStartTime = election.getVotingStartTime();
        this.votingEndTime = election.getVotingEndTime();
        this.contractAddress = election.getContractAddress();
        this.merkleRoot = election.getMerkleRoot();
        this.createdAt = election.getCreatedAt();
    }

    public static ElectionResponse from(Election election) {
        return new ElectionResponse(election);
    }
}
