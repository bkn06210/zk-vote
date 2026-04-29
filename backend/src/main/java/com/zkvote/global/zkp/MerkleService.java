package com.zkvote.global.zkp;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@Service
public class MerkleService {

    private static final Logger log = LoggerFactory.getLogger(MerkleService.class);

    @Value("${merkle.script.path:scripts/compute_merkle_root.js}")
    private String scriptPath;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public String computeRoot(List<String> secrets, int depth) {
        long start = System.currentTimeMillis();
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

            log.info("[Merkle] root 계산 완료 — 유권자 {}명, depth {}, 소요 {}ms",
                    secrets.size(), depth, System.currentTimeMillis() - start);

            return stdout.trim();
        } catch (IOException | InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Failed to invoke merkle script", e);
        }
    }
}
