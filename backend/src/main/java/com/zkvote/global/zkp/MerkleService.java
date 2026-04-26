package com.zkvote.global.zkp;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@Service
public class MerkleService {

    @Value("${merkle.script.path:scripts/compute_merkle_root.js}")
    private String scriptPath;

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Computes the Poseidon Merkle root for the given voter secrets.
     * Delegates to a Node.js script (compute_merkle_root.js) that uses circomlibjs,
     * ensuring exact compatibility with the Circom circuit's Poseidon parameters.
     *
     * @param secrets voter userSecret values (BigInteger strings)
     * @param depth   Merkle tree depth defined on the Election
     * @return Merkle root as a decimal string
     */
    public String computeRoot(List<String> secrets, int depth) {
        try {
            String input = objectMapper.writeValueAsString(Map.of("secrets", secrets, "depth", depth));

            ProcessBuilder pb = new ProcessBuilder("node", scriptPath);
            pb.redirectErrorStream(false);
            Process process = pb.start();

            try (OutputStream stdin = process.getOutputStream()) {
                stdin.write(input.getBytes(StandardCharsets.UTF_8));
            }

            String stdout = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            String stderr = new String(process.getErrorStream().readAllBytes(), StandardCharsets.UTF_8);

            int exitCode = process.waitFor();
            if (exitCode != 0) {
                throw new RuntimeException("Merkle root computation failed: " + stderr.trim());
            }

            return stdout.trim();
        } catch (IOException | InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Failed to invoke merkle script", e);
        }
    }
}
