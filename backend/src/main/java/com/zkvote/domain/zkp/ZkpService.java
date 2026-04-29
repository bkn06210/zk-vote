package com.zkvote.domain.zkp;

import com.zkvote.domain.election.Election;
import com.zkvote.domain.election.ElectionRepository;
import com.zkvote.domain.election.ElectionStatus;
import com.zkvote.domain.voter.Voter;
import com.zkvote.domain.voter.VoterRepository;
import com.zkvote.domain.zkp.dto.ProofDataResponse;
import com.zkvote.domain.zkp.dto.SubmitProofRequest;
import com.zkvote.domain.zkp.dto.SubmitProofResponse;
import com.zkvote.global.blockchain.BlockchainService;
import com.zkvote.global.zkp.MerkleProofService;
import com.zkvote.global.zkp.ZkpVerifyService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class ZkpService {

    private final ElectionRepository electionRepository;
    private final VoterRepository voterRepository;
    private final SubmissionTicketRepository ticketRepository;
    private final VoteRecordRepository voteRecordRepository;
    private final MerkleProofService merkleProofService;
    private final ZkpVerifyService zkpVerifyService;
    private final BlockchainService blockchainService;

    @Value("${zkp.files.path:../server/zkp}")
    private String zkpFilesPath;

    private static final Pattern BUILD_DIR_PATTERN = Pattern.compile("^build_(\\d+)_(\\d+)$");

    /**
     * 주어진 depth에 대해 numCandidates를 충족하는 최소 회로를 찾아 회로의 numCandidates를 반환.
     * (예: election.numCandidates=3, depth=4 → build_4_5 회로 사용 → 5 반환)
     */
    private int resolveCircuitNumCandidates(int depth, int numCandidates) {
        File zkpDir = new File(zkpFilesPath);
        File[] dirs = zkpDir.listFiles(f -> f.isDirectory() && BUILD_DIR_PATTERN.matcher(f.getName()).matches());
        if (dirs == null) {
            throw new IllegalStateException("ZKP 디렉토리를 찾을 수 없습니다.");
        }
        return Arrays.stream(dirs)
                .map(d -> {
                    Matcher m = BUILD_DIR_PATTERN.matcher(d.getName());
                    m.matches();
                    return new int[]{Integer.parseInt(m.group(1)), Integer.parseInt(m.group(2))};
                })
                .filter(pair -> pair[0] == depth && pair[1] >= numCandidates)
                .mapToInt(pair -> pair[1])
                .min()
                .orElseThrow(() -> new IllegalStateException(
                        String.format("depth=%d에서 후보 %d명을 지원하는 ZK 회로가 없습니다.", depth, numCandidates)));
    }

    @Transactional
    public ProofDataResponse getProofData(String electionId, Long userId) {
        Election election = findVotingElection(electionId);

        Voter voter = voterRepository.findByElectionIdAndUserId(electionId, userId)
                .orElseThrow(() -> new IllegalStateException("이 선거에 등록된 유권자가 아닙니다."));
        if (voter.getUserSecret() == null) {
            throw new IllegalStateException("self-register를 완료해야 투표할 수 있습니다.");
        }

        List<Voter> allVoters = voterRepository.findByElectionIdAndUserSecretIsNotNullOrderByIdAsc(electionId);
        int leafIndex = -1;
        for (int i = 0; i < allVoters.size(); i++) {
            if (allVoters.get(i).getId().equals(voter.getId())) {
                leafIndex = i;
                break;
            }
        }
        if (leafIndex < 0) {
            throw new IllegalStateException("유권자 목록에서 본인을 찾을 수 없습니다.");
        }

        List<String> secrets = allVoters.stream().map(Voter::getUserSecret).toList();
        MerkleProofService.MerkleProofResult proofResult =
                merkleProofService.computeProof(secrets, election.getMerkleTreeDepth(), leafIndex);

        if (!proofResult.root().equals(election.getMerkleRoot())) {
            throw new IllegalStateException("Merkle root 불일치: 유권자 목록이 변경되었을 수 있습니다.");
        }

        // 기존 티켓 삭제 후 새 티켓 발급 (재시도 허용)
        ticketRepository.deleteByElectionIdAndUserId(electionId, userId);
        SubmissionTicket ticket = ticketRepository.save(
                SubmissionTicket.builder()
                        .token(UUID.randomUUID().toString())
                        .electionId(electionId)
                        .userId(userId)
                        .build()
        );

        int circuitNumCandidates = resolveCircuitNumCandidates(
                election.getMerkleTreeDepth(), election.getNumCandidates());

        return new ProofDataResponse(
                voter.getUserSecret(),
                proofResult.root(),
                proofResult.pathElements(),
                proofResult.pathIndices(),
                ticket.getToken(),
                circuitNumCandidates
        );
    }

    @Transactional
    public SubmitProofResponse submitProof(String electionId, SubmitProofRequest request) {
        SubmissionTicket ticket = ticketRepository.findById(request.submissionTicket())
                .orElseThrow(() -> new IllegalArgumentException("유효하지 않은 제출 티켓입니다."));
        if (!ticket.getElectionId().equals(electionId)) {
            throw new IllegalArgumentException("티켓이 이 선거에 해당하지 않습니다.");
        }
        ticketRepository.delete(ticket);

        Election election = findVotingElection(electionId);

        List<String> publicSignals = request.publicSignals();
        // publicSignals 순서: [root_out(0), vote_index(1), nullifier_hash(2)]
        String rootOut = publicSignals.get(0);
        String nullifierHash = publicSignals.get(2);

        if (!rootOut.equals(election.getMerkleRoot())) {
            throw new IllegalArgumentException("Merkle root가 일치하지 않습니다.");
        }
        if (voteRecordRepository.existsByNullifierHash(nullifierHash)) {
            throw new IllegalStateException("이미 투표하셨습니다.");
        }

        int circuitNumCandidates = resolveCircuitNumCandidates(
                election.getMerkleTreeDepth(), election.getNumCandidates());
        String vkeyPath = zkpFilesPath + "/build_" + election.getMerkleTreeDepth()
                + "_" + circuitNumCandidates + "/verification_key.json";

        boolean valid = zkpVerifyService.verify(request.proof(), publicSignals, vkeyPath);
        if (!valid) {
            throw new IllegalArgumentException("ZK proof 검증에 실패했습니다.");
        }

        int voteIndex = Integer.parseInt(publicSignals.get(1));
        if (voteIndex < 0 || voteIndex >= election.getNumCandidates()) {
            throw new IllegalArgumentException("유효하지 않은 투표 인덱스입니다.");
        }

        String txHash = blockchainService.recordVote(
                election.getContractAddress(),
                nullifierHash,
                voteIndex,
                request.voteReceipt()
        );

        voteRecordRepository.save(VoteRecord.builder()
                .electionId(electionId)
                .voteIndex(voteIndex)
                .nullifierHash(nullifierHash)
                .voteReceipt(request.voteReceipt())
                .txHash(txHash)
                .build());

        return new SubmitProofResponse(txHash);
    }

    private Election findVotingElection(String electionId) {
        Election election = electionRepository.findById(electionId)
                .orElseThrow(() -> new IllegalArgumentException("선거를 찾을 수 없습니다."));
        if (election.getStatus() != ElectionStatus.VOTING) {
            throw new IllegalStateException("진행 중인 선거가 아닙니다.");
        }
        return election;
    }
}
