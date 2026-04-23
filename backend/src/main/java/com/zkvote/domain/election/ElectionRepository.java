package com.zkvote.domain.election;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ElectionRepository extends JpaRepository<Election, String> {

    List<Election> findByStatus(ElectionStatus status);

    // 등록 대기 중인 선거: 사전 등록됐지만 자기 등록 미완료
    @Query("SELECT e FROM Election e WHERE e.status = 'REGISTRATION' " +
           "AND EXISTS (SELECT v FROM Voter v WHERE v.election = e AND v.email = :email AND v.user IS NULL)")
    List<Election> findRegisterableByEmail(@Param("email") String email);

    // 투표 진행 중인 선거: 자기 등록 완료된 사용자
    @Query("SELECT e FROM Election e WHERE e.status = 'VOTING' " +
           "AND EXISTS (SELECT v FROM Voter v WHERE v.election = e AND v.user.id = :userId)")
    List<Election> findVotingByUserId(@Param("userId") Long userId);

    // 완료된 선거: 등록했던 사용자
    @Query("SELECT e FROM Election e WHERE e.status = 'COMPLETED' " +
           "AND EXISTS (SELECT v FROM Voter v WHERE v.election = e AND v.user.id = :userId)")
    List<Election> findCompletedByUserId(@Param("userId") Long userId);
}
