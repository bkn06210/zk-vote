package com.zkvote.domain.election;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "elections")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Election {

    @Id
    private String id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private int merkleTreeDepth;

    @Convert(converter = CandidatesConverter.class)
    @Column(nullable = false, columnDefinition = "JSON")
    private List<String> candidates;

    @Column(nullable = false)
    private int numCandidates;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ElectionStatus status = ElectionStatus.REGISTRATION;

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime registrationStartTime = LocalDateTime.now();

    private LocalDateTime registrationEndTime;
    private LocalDateTime votingStartTime;
    private LocalDateTime votingEndTime;
    private String contractAddress;
    private String merkleRoot;

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @PrePersist
    public void generateId() {
        if (this.id == null) {
            this.id = UUID.randomUUID().toString();
        }
    }

    public void startVoting(LocalDateTime votingEndTime, String merkleRoot, String contractAddress) {
        this.status = ElectionStatus.VOTING;
        this.registrationEndTime = LocalDateTime.now();
        this.votingStartTime = LocalDateTime.now();
        this.votingEndTime = votingEndTime;
        this.merkleRoot = merkleRoot;
        this.contractAddress = contractAddress;
    }

    public void complete() {
        this.status = ElectionStatus.COMPLETED;
    }
}
