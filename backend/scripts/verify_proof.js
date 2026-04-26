const snarkjs = require('snarkjs');
const fs = require('fs');

async function main() {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    const { proof, publicSignals, vkeyPath } = JSON.parse(Buffer.concat(chunks).toString());

    const vkey = JSON.parse(fs.readFileSync(vkeyPath, 'utf8'));
    const isValid = await snarkjs.groth16.verify(vkey, publicSignals, proof);

    process.stdout.write(JSON.stringify({ valid: isValid }) + '\n');
}

main().catch(err => {
    process.stderr.write(err.message + '\n');
    process.exit(1);
});
