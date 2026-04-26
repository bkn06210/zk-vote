# ADR-008: ZK Proof 검증 전략

## 상태
채택

## 배경
유권자가 투표를 제출할 때 ZK proof를 검증해야 한다.
검증을 온체인(스마트 컨트랙트)에서 할지, 오프체인(서버)에서 할지 결정이 필요했다.

## 선택지

| 방식 | 설명 |
|------|------|
| A. 온체인 검증 | 투표마다 Solidity verifier 컨트랙트 호출 → 가스비 발생 |
| B. 오프체인 검증 | 서버가 snarkjs로 검증 → 온체인 기록은 집계 결과만 |

## 결정
**오프체인 검증 (B)** 을 선택한다.

- `POST /api/elections/{id}/proof` — 인증된 유권자에게 Merkle 증명 데이터 + 단일 사용 티켓 반환
- `POST /api/elections/{id}/submit` — 익명 엔드포인트, snarkjs로 ZK proof 검증 후 투표 기록
- `contractAddress`는 선거 결과의 온체인 감사용으로 보존

## 이유

**온체인을 버린 이유**: 투표 1건마다 Ethereum 트랜잭션이 발생하면 가스비가 수천 원 이상 든다.
실제 선거에서 유권자 수백 명 × 1회 = 막대한 비용이므로 현실적이지 않다.

**오프체인을 선택한 이유**: 서버가 검증하므로 가스비 없음.
ZK proof의 수학적 건전성은 동일하게 보장된다.
온체인 검증이 아니더라도 "서버가 잘못된 proof를 수락할 수 없다"는 것이 ZK의 핵심이다.

**신뢰성 보완**: `contractAddress`에 선거 스마트 컨트랙트 주소가 저장되어 있으므로,
집계 결과를 온체인에 기록하거나 etherscan에서 감사할 수 있는 구조는 유지된다.

## 익명성 보장 구조 (단일 사용 티켓)

ZK proof의 목적 중 하나는 "누가 누구에게 투표했는지 서버도 알 수 없어야 한다"는 것이다.

이를 위해 2단계 분리 구조를 채택했다:

1. **`/proof` (인증)**: JWT로 신원 확인 → `user_secret` + Merkle 경로 + 단일 사용 티켓 반환
2. **`/submit` (익명)**: 티켓만으로 인가 → JWT 불필요, 투표 제출

티켓은 DB에 저장되며 1회 사용 후 삭제된다.
이 구조 덕분에 서버는 "누가 증명 데이터를 요청했는가"와 "어떤 증명이 제출됐는가"를 연결할 수 없다.

> **한계**: 현재 프론트엔드는 동일한 axios 인스턴스를 사용하므로 `/submit` 호출 시 JWT가
> 헤더에 포함될 수 있다. 서버는 이를 무시하지만, 완전한 익명성을 위해서는 `/submit`을
> JWT 없이 별도 axios 인스턴스로 호출해야 한다. 포트폴리오 범위에서는 허용.

## 이중 투표 방지

ZK 회로가 출력하는 `nullifier_hash = Poseidon(user_secret, election_id)` 를 DB에 저장한다.
동일한 `nullifier_hash`가 재사용되면 거부한다.

- `user_secret`이 다르면 `nullifier_hash`도 다름 → 다른 사람의 nullifier를 도용 불가
- `election_id`가 다르면 `nullifier_hash`도 다름 → 선거 간 nullifier 재사용 불가

## Merkle root 검증

`publicSignals[0]` = `root_out` (ZK proof 공개 출력)이 선거의 저장된 `merkleRoot`와 일치해야 한다.
회로 제약에 의해 `root_out = root_in`이므로, 이 검사는 "프루버가 올바른 유권자 목록을 사용했는가"를 보장한다.

## snarkjs 구현 방식

Java에서 직접 Groth16 검증을 구현하면 BN254 곡선 상수 불일치 위험이 있다.
Merkle root 계산과 동일하게 Node.js subprocess(`verify_proof.js`)에 위임하여
circomlibjs와 완전히 동일한 라이브러리 환경을 보장한다.

## 트레이드오프
- 온체인 검증 없이도 수학적 증명은 유효하나, 제3자가 서버 로그를 신뢰해야 하는 부분이 남는다.
- 집계 결과를 온체인에 기록하는 방식으로 보완 가능 (향후 확장).
