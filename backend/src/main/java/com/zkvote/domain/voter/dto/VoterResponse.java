package com.zkvote.domain.voter.dto;

import com.zkvote.domain.voter.Voter;
import lombok.Getter;

@Getter
public class VoterResponse {

    private final String id;
    private final String electionId;
    private final String email;
    private final String name;
    private final boolean registered;

    private VoterResponse(Voter voter) {
        this.id = voter.getId();
        this.electionId = voter.getElection().getId();
        this.email = voter.getEmail();
        this.name = voter.getName();
        this.registered = voter.getUser() != null;
    }

    public static VoterResponse from(Voter voter) {
        return new VoterResponse(voter);
    }
}