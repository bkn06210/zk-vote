package com.zkvote.global.blockchain;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@Service
public class BlockchainService {

    private static final Logger log = LoggerFactory.getLogger(BlockchainService.class);

    @Value("${blockchain.enabled:false}")
    private boolean enabled;

    @Value("${blockchain.rpc-url:}")
    private String rpcUrl;

    @Value("${blockchain.private-key:}")
    private String privateKey;

    @Value("${blockchain.record-script.path:scripts/record_vote.js}")
    private String scriptPath;

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * contractAddress가 null이거나 blockchain.enabled=false면 블록체인 기록을 건너뜁니다.
     *
     * @return 트랜잭션 해시, 또는 비활성화 시 null
     */
    public String recordVote(String contractAddress, String nullifierHash,
                             int candidateIndex, String voteReceipt) {
        if (!enabled || contractAddress == null || contractAddress.isBlank()) {
            log.info("[Blockchain] 블록체인 연동 비활성화 — contractAddress={}", contractAddress);
            return null;
        }

        long start = System.currentTimeMillis();
        try {
            String input = objectMapper.writeValueAsString(Map.of(
                    "nullifierHash", nullifierHash,
                    "candidateIndex", candidateIndex,
                    "voteReceipt", voteReceipt,
                    "contractAddress", contractAddress,
                    "rpcUrl", rpcUrl,
                    "privateKey", privateKey
            ));

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
                log.error("[Blockchain] 트랜잭션 실패: {}", stderr.trim());
                throw new RuntimeException("블록체인 기록 실패: " + stderr.trim());
            }

            JsonNode result = objectMapper.readTree(stdout.trim());
            String txHash = result.get("txHash").asText();

            log.info("[Blockchain] 기록 완료 — txHash={}, 소요 {}ms", txHash, System.currentTimeMillis() - start);
            return txHash;

        } catch (IOException | InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("블록체인 스크립트 실행 실패", e);
        }
    }
}
