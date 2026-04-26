# ADR-007: Merkle root 계산 주체

## 상태
채택 (ADR-003의 merkleRoot 처리 방식을 대체)

## 배경
REGISTRATION → VOTING 전환 시 Merkle tree를 생성해야 한다.
ZK proof 검증의 핵심은 "Merkle root가 신뢰할 수 있는 유권자 목록에서 계산되었는가"이다.
누가 이 계산을 담당할지 결정이 필요했다.

## 선택지

| 방식 | 설명 |
|------|------|
| A. Admin이 계산해서 API로 전송 | `start-voting` 요청 body에 merkleRoot 포함 |
| B. 서버가 DB 기반으로 자동 계산 | `start-voting` 호출 시 서버가 voters 조회 → root 계산 |
| C. 프론트엔드가 계산, 서버가 검증 | 클라이언트가 계산 후 전송, 서버는 재계산으로 검증 |

## 결정
**서버가 자동 계산 (B)** 을 선택한다.

- `POST /api/elections/{id}/start-voting` 호출 시
- 서버가 `voters` 테이블에서 `userSecret`이 있는 유권자를 id 오름차순으로 조회
- circomlibjs 기반 Node.js 스크립트(`compute_merkle_root.js`)를 ProcessBuilder로 호출해 root 계산
- 계산된 root를 `elections.merkleRoot`에 저장 후 변경 불가

## 이유

**A를 버린 이유**: Admin이 merkleRoot를 직접 제출하면 신뢰 모델이 깨진다.
"Admin이 원하는 root를 심을 수 있다"는 의미이므로, ZK proof가 증명하려는 "조작 불가능한 유권자 목록" 보장이 무효화된다.

**C를 버린 이유**: 서버가 어차피 재계산해서 검증한다면 서버가 직접 계산하는 것과 다르지 않고, 왕복 비용만 늘어난다.

**B를 선택한 이유**: root의 신뢰 기반이 DB(서버 관리)이므로 조작 불가능하다. 이것이 ZK 시스템의 핵심 보안 전제이다.

## Poseidon hash 구현 방식

Circom 회로는 BN254 곡선 위의 Poseidon hash를 사용한다.
Java로 Poseidon 상수를 직접 구현할 경우 circomlibjs와 상수 불일치 위험이 있어 ZK proof 검증이 깨질 수 있다.

따라서 circomlibjs를 사용하는 Node.js 스크립트(`backend/scripts/compute_merkle_root.js`)를
Spring의 `ProcessBuilder`로 호출해 100% 회로 호환성을 보장한다.

`MerkleService`가 이 subprocess 호출을 캡슐화하므로, 나중에 Java 네이티브 구현으로 교체해도 호출부는 변경이 없다.

## 트레이드오프
- 서버에 Node.js 런타임이 필요하다 (개발/배포 환경 의존성 추가).
- subprocess 호출이므로 대규모 유권자에서는 성능 이슈가 생길 수 있다. (포트폴리오 규모에서는 무관)
- 장점: Circom 회로와 동일한 라이브러리를 사용하므로 root 불일치 버그 원천 차단.
