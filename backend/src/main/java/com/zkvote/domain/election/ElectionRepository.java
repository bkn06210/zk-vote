package com.zkvote.domain.election;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ElectionRepository extends JpaRepository<Election, String> {

    List<Election> findByStatus(ElectionStatus status);

    @Query("SELECT e FROM Election e WHERE e.status = :status " +
           "AND EXISTS (SELECT v FROM Voter v WHERE v.election = e AND v.email = :email AND v.user IS NULL)")
    List<Election> findRegisterableByEmail(@Param("email") String email,
                                           @Param("status") ElectionStatus status);

    @Query("SELECT e FROM Election e WHERE e.status = :status " +
           "AND EXISTS (SELECT v FROM Voter v WHERE v.election = e AND v.user.id = :userId)")
    List<Election> findByStatusAndUserId(@Param("status") ElectionStatus status,
                                         @Param("userId") Long userId);
}
