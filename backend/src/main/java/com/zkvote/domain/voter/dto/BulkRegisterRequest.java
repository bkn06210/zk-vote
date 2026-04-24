package com.zkvote.domain.voter.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotEmpty;
import lombok.Getter;

import java.util.List;

@Getter
public class BulkRegisterRequest {

    @NotEmpty
    private List<@Email @NotEmpty String> emails;
}