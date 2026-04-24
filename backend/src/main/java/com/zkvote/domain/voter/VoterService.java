package com.zkvote.domain.voter;

import com.zkvote.domain.election.Election;
import com.zkvote.domain.election.ElectionRepository;
import com.zkvote.domain.election.ElectionStatus;
import com.zkvote.domain.user.User;
import com.zkvote.domain.user.UserRepository;
import com.zkvote.domain.voter.dto.BulkRegisterRequest;
import com.zkvote.domain.voter.dto.VoterResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.List;

@Service
@RequiredArgsConstructor
public class VoterService {

    private final VoterRepository voterRepository;
    private final ElectionRepository electionRepository;
    private final UserRepository userRepository;

    @Value("${app.secret-salt}")
    private String secretSalt;

    @Transactional
    public List<VoterResponse> bulkRegister(String electionId, BulkRegisterRequest request) {
        Election election = findElectionInRegistration(electionId);

        List<String> newEmails = request.getEmails().stream()
                .filter(email -> !voterRepository.existsByElectionIdAndEmail(electionId, email))
                .toList();

        List<Voter> voters = newEmails.stream()
                .map(email -> Voter.builder()
                        .election(election)
                        .email(email)
                        .build())
                .toList();

        return voterRepository.saveAll(voters).stream()
                .map(VoterResponse::from)
                .toList();
    }

    @Transactional
    public VoterResponse selfRegister(String electionId, Long userId) {
        findElectionInRegistration(electionId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        if (voterRepository.existsByElectionIdAndUserId(electionId, userId)) {
            throw new IllegalStateException("이미 등록된 유권자입니다.");
        }

        Voter voter = voterRepository.findByElectionIdAndEmail(electionId, user.getEmail())
                .orElseThrow(() -> new IllegalStateException("사전 등록된 유권자가 아닙니다."));

        String userSecret = generateUserSecret(userId);
        voter.register(user, user.getName(), userSecret);

        return VoterResponse.from(voter);
    }

    @Transactional(readOnly = true)
    public List<VoterResponse> getVoters(String electionId) {
        findElectionOrThrow(electionId);
        return voterRepository.findByElectionIdAndUserSecretIsNotNullOrderByIdAsc(electionId).stream()
                .map(VoterResponse::from)
                .toList();
    }

    private Election findElectionInRegistration(String electionId) {
        Election election = findElectionOrThrow(electionId);
        if (election.getStatus() != ElectionStatus.REGISTRATION) {
            throw new IllegalStateException("등록 기간이 아닙니다.");
        }
        return election;
    }

    private Election findElectionOrThrow(String electionId) {
        return electionRepository.findById(electionId)
                .orElseThrow(() -> new IllegalArgumentException("선거를 찾을 수 없습니다."));
    }

    private String generateUserSecret(Long userId) {
        try {
            String input = userId + secretSalt;
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) {
                hex.append(String.format("%02x", b));
            }
            return new java.math.BigInteger(hex.toString(), 16).toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 알고리즘을 사용할 수 없습니다.", e);
        }
    }
}
