const hre = require("hardhat");
require("dotenv").config();

/**
 * 사용법:
 * ELECTION_ID=<uuid> NUM_CANDIDATES=5 npx hardhat run scripts/deployAll.js --network sepolia
 */
async function main() {
    const electionUUID = process.env.ELECTION_ID;
    const numCandidates = parseInt(process.env.NUM_CANDIDATES);

    if (!electionUUID || isNaN(numCandidates)) {
        console.error("필수 환경변수: ELECTION_ID, NUM_CANDIDATES");
        console.error("예시: ELECTION_ID=550e8400-e29b-41d4-... NUM_CANDIDATES=5 npx hardhat run scripts/deployAll.js --network sepolia");
        process.exit(1);
    }

    const hexUUID = "0x" + electionUUID.replace(/-/g, "");
    const electionId = BigInt(hexUUID);

    console.log(`선거 ID: ${electionUUID}`);
    console.log(`후보 수: ${numCandidates}`);

    const VotingTally = await hre.ethers.getContractFactory("VotingTally");
    const votingTally = await VotingTally.deploy(electionId, numCandidates);
    await votingTally.waitForDeployment();

    const address = await votingTally.getAddress();
    console.log(`\nVotingTally 배포 완료: ${address}`);
    console.log(`\n다음 단계:`);
    console.log(`1. 위 주소를 선거 시작(start-voting) 시 컨트랙트 주소로 입력`);
    console.log(`2. application.yml에 BLOCKCHAIN_CONTRACT_ADDRESS=${address} 설정`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
