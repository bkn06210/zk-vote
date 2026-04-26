/**
 * Reads { secrets: string[], depth: number } from stdin as JSON.
 * Computes the Poseidon Merkle root using circomlibjs (same params as Circom circuit).
 * Prints the root as a decimal string to stdout.
 */
const { buildPoseidon } = require('circomlibjs');
const { MerkleTree } = require('fixed-merkle-tree');

// Must match tornado-core / the original server/utils/merkle.js
const ZERO_ELEMENT = '21663839004416932945382355908790599225266501822907911457504978515578255421292';

async function main() {
    let inputData = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => { inputData += chunk; });
    process.stdin.on('end', async () => {
        try {
            const { secrets, depth } = JSON.parse(inputData);
            const poseidon = await buildPoseidon();

            const leaves = secrets.map(s => poseidon.F.toString(poseidon([BigInt(s)])));

            const tree = new MerkleTree(depth, leaves, {
                hashFunction: (a, b) => poseidon.F.toString(poseidon([BigInt(a), BigInt(b)])),
                zeroElement: ZERO_ELEMENT,
            });

            process.stdout.write(tree.root.toString() + '\n');
        } catch (err) {
            process.stderr.write(err.message + '\n');
            process.exit(1);
        }
    });
}

main();
