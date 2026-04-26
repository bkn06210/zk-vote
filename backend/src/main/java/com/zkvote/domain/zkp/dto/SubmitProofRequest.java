package com.zkvote.domain.zkp.dto;

import com.fasterxml.jackson.databind.JsonNode;

import java.util.List;

public record SubmitProofRequest(
        JsonNode proof,
        List<String> publicSignals,
        String submissionTicket
) {}
