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

CREATE TABLE elections (
    id                      CHAR(36)     NOT NULL PRIMARY KEY,
    name                    VARCHAR(255) NOT NULL,
    merkle_tree_depth       INT          NOT NULL,
    candidates              JSON         NOT NULL,
    num_candidates          INT          NOT NULL,
    registration_start_time DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    registration_end_time   DATETIME     NOT NULL,
    voting_start_time       DATETIME              DEFAULT NULL,
    voting_end_time         DATETIME              DEFAULT NULL,
    contract_address        VARCHAR(42)           DEFAULT NULL,
    merkle_root             VARCHAR(255)          DEFAULT NULL,
    completed               TINYINT(1)   NOT NULL DEFAULT 0,
    created_at              DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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
