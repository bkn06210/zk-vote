package com.zkvote.domain.admin;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AdminInvitationRepository extends JpaRepository<AdminInvitation, String> {
    boolean existsByEmail(String email);
}
