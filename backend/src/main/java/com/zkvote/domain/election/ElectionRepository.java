package com.zkvote.domain.election;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ElectionRepository extends JpaRepository<Election, String> {
    List<Election> findByStatus(ElectionStatus status);
}
