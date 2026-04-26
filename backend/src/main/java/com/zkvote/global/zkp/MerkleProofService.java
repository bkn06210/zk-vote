package com.zkvote.global.zkp;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class MerkleProofService {

    @Value("${merkle.proof-script.path:scripts/compute_merkle_proof.js}")
    private String scriptPath;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public record MerkleProofResult(String root, List<String> pathElements, List<Integer> pathIndices) {}

    public MerkleProofResult computeProof(List<String> secrets, int depth, int leafIndex) {
        try {
            String input = objectMapper.writeValueAsString(
                    Map.of("secrets", secrets, "depth", depth, "leafIndex", leafIndex));

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
                throw new RuntimeException("Merkle proof computation failed: " + stderr.trim());
            }

            JsonNode node = objectMapper.readTree(stdout.trim());
            String root = node.get("root").asText();

            List<String> pathElements = new ArrayList<>();
            node.get("pathElements").forEach(e -> pathElements.add(e.asText()));

            List<Integer> pathIndices = new ArrayList<>();
            node.get("pathIndices").forEach(e -> pathIndices.add(e.asInt()));

            return new MerkleProofResult(root, pathElements, pathIndices);
        } catch (IOException | InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Failed to invoke merkle proof script", e);
        }
    }
}
