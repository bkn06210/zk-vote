package com.zkvote.domain.election;

import com.zkvote.domain.election.dto.CreateElectionRequest;
import com.zkvote.domain.election.dto.ElectionResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ElectionService {

    private final ElectionRepository electionRepository;

    @Transactional
    public ElectionResponse create(CreateElectionRequest request) {
        Election election = Election.builder()
                .name(request.getName())
                .merkleTreeDepth(request.getMerkleTreeDepth())
                .candidates(request.getCandidates())
                .numCandidates(request.getCandidates().size())
                .registrationEndTime(request.getRegistrationEndTime())
                .build();

        return ElectionResponse.from(electionRepository.save(election));
    }

    @Transactional(readOnly = true)
    public List<ElectionResponse> getAll() {
        return electionRepository.findAll().stream()
                .map(ElectionResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ElectionResponse> getRegisterable(String email) {
        return electionRepository.findRegisterableByEmail(email).stream()
                .map(ElectionResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ElectionResponse> getVoting(Long userId) {
        return electionRepository.findVotingByUserId(userId).stream()
                .map(ElectionResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ElectionResponse> getCompleted(Long userId) {
        return electionRepository.findCompletedByUserId(userId).stream()
                .map(ElectionResponse::from)
                .toList();
    }
}
