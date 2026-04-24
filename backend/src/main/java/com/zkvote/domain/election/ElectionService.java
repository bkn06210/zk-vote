package com.zkvote.domain.election;

import com.zkvote.domain.election.dto.CreateElectionRequest;
import com.zkvote.domain.election.dto.ElectionResponse;
import com.zkvote.domain.election.dto.StartVotingRequest;
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

    @Transactional
    public ElectionResponse startVoting(String electionId, StartVotingRequest request) {
        Election election = findElectionOrThrow(electionId);

        if (election.getStatus() != ElectionStatus.REGISTRATION) {
            throw new IllegalStateException("등록 기간인 선거만 투표를 시작할 수 있습니다.");
        }

        election.startVoting(request.getVotingEndTime(), request.getMerkleRoot(), request.getContractAddress());
        return ElectionResponse.from(election);
    }

    @Transactional
    public ElectionResponse complete(String electionId) {
        Election election = findElectionOrThrow(electionId);

        if (election.getStatus() != ElectionStatus.VOTING) {
            throw new IllegalStateException("투표 진행 중인 선거만 완료할 수 있습니다.");
        }

        election.complete();
        return ElectionResponse.from(election);
    }

    private Election findElectionOrThrow(String electionId) {
        return electionRepository.findById(electionId)
                .orElseThrow(() -> new IllegalArgumentException("선거를 찾을 수 없습니다."));
    }
}
