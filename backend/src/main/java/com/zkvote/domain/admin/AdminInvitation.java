package com.zkvote.domain.admin;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "admin_invitations")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AdminInvitation {

    @Id
    private String email;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public static AdminInvitation of(String email) {
        AdminInvitation invitation = new AdminInvitation();
        invitation.email = email;
        return invitation;
    }
}
