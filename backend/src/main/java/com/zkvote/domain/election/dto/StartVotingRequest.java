package com.zkvote.domain.election.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
public class StartVotingRequest {

    @NotBlank
    private String merkleRoot;

    @NotBlank
    private String contractAddress;

    @Future
    private LocalDateTime votingEndTime;
}
