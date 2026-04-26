package com.zkvote.global.zkp;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@Service
public class ZkpVerifyService {

    @Value("${zkp.verify-script.path:scripts/verify_proof.js}")
    private String scriptPath;

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Verifies a Groth16 ZK proof using snarkjs via a Node.js subprocess.
     * publicSignals order (from circuit Main template): [root_out, vote_index, nullifier_hash]
     */
    public boolean verify(JsonNode proof, List<String> publicSignals, String vkeyPath) {
        try {
            String input = objectMapper.writeValueAsString(
                    Map.of("proof", proof, "publicSignals", publicSignals, "vkeyPath", vkeyPath));

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
                throw new RuntimeException("ZK proof verification failed: " + stderr.trim());
            }

            JsonNode result = objectMapper.readTree(stdout.trim());
            return result.get("valid").asBoolean();
        } catch (IOException | InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Failed to invoke verify script", e);
        }
    }
}
