package com.zkvote.domain.voter;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface VoterRepository extends JpaRepository<Voter, String> {
    Optional<Voter> findByElectionIdAndEmail(String electionId, String email);
    Optional<Voter> findByElectionIdAndUserId(String electionId, Long userId);
    boolean existsByElectionIdAndEmail(String electionId, String email);
    boolean existsByElectionIdAndUserId(String electionId, Long userId);

    // Merkle tree 생성 시 순서가 결정적이어야 하므로 id 기준 정렬
    List<Voter> findByElectionIdAndUserSecretIsNotNullOrderByIdAsc(String electionId);
}
