CREATE TABLE users (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    email      VARCHAR(255) NOT NULL UNIQUE,
    password   VARCHAR(255) NOT NULL,
    name       VARCHAR(100),
    role       ENUM('USER', 'ADMIN') NOT NULL DEFAULT 'USER',
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE admin_invitations (
    email      VARCHAR(255) NOT NULL PRIMARY KEY,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- id는 UUID를 애플리케이션(JPA)에서 생성하여 삽입
CREATE TABLE elections (
    id                      CHAR(36)                                              NOT NULL PRIMARY KEY,
    name                    VARCHAR(255)                                          NOT NULL,
    merkle_tree_depth       INT                                                   NOT NULL,
    candidates              JSON                                                  NOT NULL,
    num_candidates          INT                                                   NOT NULL,
    status                  ENUM('REGISTRATION', 'VOTING', 'COMPLETED') NOT NULL DEFAULT 'REGISTRATION',
    registration_start_time DATETIME                                     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    registration_end_time   DATETIME                                              DEFAULT NULL,
    voting_start_time       DATETIME                                              DEFAULT NULL,
    voting_end_time         DATETIME                                              DEFAULT NULL,
    contract_address        VARCHAR(42)                                           DEFAULT NULL,
    merkle_root             VARCHAR(255)                                          DEFAULT NULL,
    created_at              DATETIME                                     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE submission_tickets (
    token       CHAR(36)     NOT NULL PRIMARY KEY,
    election_id CHAR(36)     NOT NULL,
    user_id     BIGINT       NOT NULL,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_ticket_election_user (election_id, user_id),
    CONSTRAINT fk_ticket_election FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE,
    CONSTRAINT fk_ticket_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE vote_records (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    election_id    CHAR(36)     NOT NULL,
    vote_index     INT          NOT NULL,
    nullifier_hash VARCHAR(255) NOT NULL,
    submitted_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_nullifier (nullifier_hash),
    CONSTRAINT fk_vote_record_election FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE
);

-- id는 UUID를 애플리케이션(JPA)에서 생성하여 삽입
CREATE TABLE voters (
    id          CHAR(36)     NOT NULL PRIMARY KEY,
    election_id CHAR(36)     NOT NULL,
    email       VARCHAR(255) NOT NULL,
    user_id     BIGINT                DEFAULT NULL,
    name        VARCHAR(100)          DEFAULT NULL,
    user_secret TEXT                  DEFAULT NULL,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_election_email (election_id, email),
    UNIQUE KEY uq_election_user (election_id, user_id),
    CONSTRAINT fk_voter_election FOREIGN KEY (election_id) REFERENCES elections (id) ON DELETE CASCADE,
    CONSTRAINT fk_voter_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
);
