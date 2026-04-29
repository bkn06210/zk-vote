// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title VotingTally
 * @dev ZK proof 검증은 서버(오프체인)에서 수행하고,
 *      서버 지갑이 검증 완료된 투표 결과를 이 컨트랙트에 기록한다.
 *      유권자는 본인만 아는 nonce로 vote_receipt를 계산해 자신의 투표가
 *      위조 없이 기록됐는지 직접 검증할 수 있다.
 */
contract VotingTally {

    address public owner;
    uint256 public immutable electionId;
    uint256 public immutable numCandidates;

    // nullifierHash → candidateIndex + 1 (0이면 미투표)
    mapping(uint256 => uint256) public votes;

    // nullifierHash → voteReceipt (SHA-256(nullifier + nonce + voteIndex))
    mapping(uint256 => bytes32) public voteReceipts;

    // candidateIndex → 득표 수
    mapping(uint256 => uint256) public voteCounts;

    event VoteCast(uint256 indexed nullifierHash, uint256 candidateIndex, bytes32 voteReceipt);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(uint256 _electionId, uint256 _numCandidates) {
        owner = msg.sender;
        electionId = _electionId;
        numCandidates = _numCandidates;
    }

    /**
     * @dev 서버가 오프체인 ZK 검증 완료 후 호출.
     *      voteReceipt = SHA-256(nullifierHash + nonce + candidateIndex) — nonce는 유권자만 앎.
     */
    function recordVote(
        uint256 nullifierHash,
        uint256 candidateIndex,
        bytes32 voteReceipt
    ) external onlyOwner {
        require(votes[nullifierHash] == 0, "Already voted");
        require(candidateIndex < numCandidates, "Invalid candidate");

        votes[nullifierHash] = candidateIndex + 1;
        voteReceipts[nullifierHash] = voteReceipt;
        voteCounts[candidateIndex]++;

        emit VoteCast(nullifierHash, candidateIndex, voteReceipt);
    }

    function getVoteCount(uint256 candidateIndex) external view returns (uint256) {
        return voteCounts[candidateIndex];
    }
}
