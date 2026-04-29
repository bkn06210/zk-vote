/**
 * Reads JSON from stdin:
 * { nullifierHash, candidateIndex, voteReceipt, contractAddress, rpcUrl, privateKey }
 *
 * Calls VotingTally.recordVote() on-chain and prints the tx hash to stdout.
 */
const { ethers } = require('ethers');

const ABI = [
    'function recordVote(uint256 nullifierHash, uint256 candidateIndex, bytes32 voteReceipt) external'
];

async function main() {
    let inputData = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => { inputData += chunk; });
    process.stdin.on('end', async () => {
        try {
            const { nullifierHash, candidateIndex, voteReceipt, contractAddress, rpcUrl, privateKey } = JSON.parse(inputData);

            const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
            const wallet = new ethers.Wallet(privateKey, provider);
            const contract = new ethers.Contract(contractAddress, ABI, wallet);

            const tx = await contract.recordVote(
                ethers.BigNumber.from(nullifierHash),
                ethers.BigNumber.from(candidateIndex),
                voteReceipt  // bytes32 hex string from frontend
            );
            const receipt = await tx.wait();

            process.stdout.write(JSON.stringify({ success: true, txHash: receipt.transactionHash }));
            process.exit(0);
        } catch (err) {
            process.stderr.write(JSON.stringify({ success: false, error: err.message }));
            process.exit(1);
        }
    });
}

main();
