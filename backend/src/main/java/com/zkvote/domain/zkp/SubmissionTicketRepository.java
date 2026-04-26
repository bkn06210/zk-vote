package com.zkvote.domain.zkp;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SubmissionTicketRepository extends JpaRepository<SubmissionTicket, String> {
    void deleteByElectionIdAndUserId(String electionId, Long userId);
}
