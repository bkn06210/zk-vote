package com.zkvote.domain.election.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.Future;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
public class StartVotingRequest {

    private String contractAddress;

    // HTML datetime-local input은 초를 포함하지 않아 ISO_LOCAL_DATE_TIME 파싱 실패
    // → 명시적 패턴으로 처리
    @Future
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm")
    private LocalDateTime votingEndTime;
}
