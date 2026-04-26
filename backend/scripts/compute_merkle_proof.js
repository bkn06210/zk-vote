const { buildPoseidon } = require('circomlibjs');
const { MerkleTree } = require('fixed-merkle-tree');

const ZERO_ELEMENT = '21663839004416932945382355908790599225266501822907911457504978515578255421292';

async function main() {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    const { secrets, depth, leafIndex } = JSON.parse(Buffer.concat(chunks).toString());

    const poseidon = await buildPoseidon();
    const leaves = secrets.map(s => poseidon.F.toString(poseidon([BigInt(s)])));

    const tree = new MerkleTree(depth, leaves, {
        hashFunction: (a, b) => poseidon.F.toString(poseidon([BigInt(a), BigInt(b)])),
        zeroElement: ZERO_ELEMENT,
    });

    const { pathElements, pathIndices } = tree.path(leafIndex);

    process.stdout.write(JSON.stringify({
        root: tree.root.toString(),
        pathElements: pathElements.map(e => e.toString()),
        pathIndices,
    }) + '\n');
}

main().catch(err => {
    process.stderr.write(err.message + '\n');
    process.exit(1);
});
