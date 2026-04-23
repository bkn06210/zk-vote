package com.zkvote.domain.election.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
public class CreateElectionRequest {

    @NotBlank
    private String name;

    @Min(3)
    private int merkleTreeDepth;

    @NotEmpty
    private List<@NotBlank String> candidates;

    @Future
    private LocalDateTime registrationEndTime;
}
