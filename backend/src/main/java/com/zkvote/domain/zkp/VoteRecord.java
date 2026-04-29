package com.zkvote.domain.zkp;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "vote_records")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class VoteRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String electionId;

    @Column(nullable = false)
    private int voteIndex;

    @Column(nullable = false)
    private String nullifierHash;

    @Column
    private String voteReceipt;

    @Column
    private String txHash;

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime submittedAt = LocalDateTime.now();
}
