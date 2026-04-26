package com.zkvote.domain.zkp;

import org.springframework.data.jpa.repository.JpaRepository;

public interface VoteRecordRepository extends JpaRepository<VoteRecord, Long> {
    boolean existsByNullifierHash(String nullifierHash);
}
