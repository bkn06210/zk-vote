package com.zkvote.domain.election;

import com.zkvote.domain.election.dto.CircuitOptionResponse;
import com.zkvote.domain.election.dto.CreateElectionRequest;
import com.zkvote.domain.election.dto.ElectionResponse;
import com.zkvote.domain.election.dto.StartVotingRequest;
import com.zkvote.domain.voter.Voter;
import com.zkvote.domain.voter.VoterRepository;
import com.zkvote.global.zkp.MerkleService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.io.IOException;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class ElectionService {

    private static final Logger log = LoggerFactory.getLogger(ElectionService.class);

    private final ElectionRepository electionRepository;
    private final VoterRepository voterRepository;
    private final MerkleService merkleService;
    private final ResourceLoader resourceLoader;

    @Value("${zkp.files.path:../server/zkp}")
    private String zkpFilesPath;

    private static final Pattern BUILD_DIR_PATTERN = Pattern.compile("^build_(\\d+)_(\\d+)$");

    public List<CircuitOptionResponse> getCircuitOptions() {
        File zkpDir;
        try {
            Resource resource = resourceLoader.getResource("file:" + zkpFilesPath);
            zkpDir = resource.getFile();
        } catch (IOException e) {
            log.warn("[Circuit] ZKP 디렉토리를 찾을 수 없습니다: {} ({})", zkpFilesPath, e.getMessage());
            return List.of();
        }
        log.info("[Circuit] ZKP 디렉토리 스캔: {}", zkpDir.getAbsolutePath());
        File[] dirs = zkpDir.listFiles(f -> f.isDirectory() && BUILD_DIR_PATTERN.matcher(f.getName()).matches());
        if (dirs == null || dirs.length == 0) {
            log.warn("[Circuit] build_*_* 디렉토리를 찾지 못했습니다: {}", zkpDir.getAbsolutePath());
            return List.of();
        }
        // depth별로 가장 큰 numCandidates 회로를 선택 (zero-padding으로 더 적은 후보도 지원)
        Map<Integer, Integer> depthToMaxCandidates = new java.util.HashMap<>();
        for (File dir : dirs) {
            Matcher m = BUILD_DIR_PATTERN.matcher(dir.getName());
            m.matches();
            int depth = Integer.parseInt(m.group(1));
            int candidates = Integer.parseInt(m.group(2));
            depthToMaxCandidates.merge(depth, candidates, Math::max);
        }

        return depthToMaxCandidates.entrySet().stream()
                .map(e -> {
                    int depth = e.getKey();
                    int maxCandidates = e.getValue();
                    int maxVoters = 1 << depth;
                    String label = String.format("최대 %d명 유권자 · 후보 최대 %d명", maxVoters, maxCandidates);
                    return new CircuitOptionResponse(depth, maxCandidates, maxVoters, label);
                })
                .sorted(Comparator.comparingInt(CircuitOptionResponse::maxVoters))
                .toList();
    }

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
        return electionRepository.findRegisterableByEmail(email, ElectionStatus.REGISTRATION).stream()
                .map(ElectionResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ElectionResponse> getVoting(Long userId) {
        return electionRepository.findByStatusAndUserId(ElectionStatus.VOTING, userId).stream()
                .map(ElectionResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ElectionResponse> getCompleted(Long userId) {
        return electionRepository.findByStatusAndUserId(ElectionStatus.COMPLETED, userId).stream()
                .map(ElectionResponse::from)
                .toList();
    }

    @Transactional
    public ElectionResponse startVoting(String electionId, StartVotingRequest request) {
        Election election = findElectionOrThrow(electionId);

        if (election.getStatus() != ElectionStatus.REGISTRATION) {
            throw new IllegalStateException("등록 기간인 선거만 투표를 시작할 수 있습니다.");
        }

        List<String> secrets = voterRepository
                .findByElectionIdAndUserSecretIsNotNullOrderByIdAsc(electionId)
                .stream()
                .map(Voter::getUserSecret)
                .toList();

        if (secrets.isEmpty()) {
            throw new IllegalStateException("등록된 유권자가 없어 투표를 시작할 수 없습니다.");
        }

        String merkleRoot = merkleService.computeRoot(secrets, election.getMerkleTreeDepth());

        election.startVoting(request.getVotingEndTime(), request.getContractAddress(), merkleRoot);
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
