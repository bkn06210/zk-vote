# ADR-003: 선거 상태 전환 방식

## 상태
채택

## 배경
선거는 `REGISTRATION → VOTING → COMPLETED` 3단계로 진행된다.
상태 전환을 어떻게 트리거할지 결정이 필요했다.

## 선택지

| 방식 | 설명 |
|------|------|
| A. 관리자 수동 API | 관리자가 직접 엔드포인트 호출 |
| B. 시간 기반 자동 전환 | 스케줄러가 registrationEndTime 이후 자동 전환 |
| C. 수동 + 자동 병행 | 둘 다 지원 |

## 결정
**관리자 수동 API (A)** 를 선택한다.

- `POST /api/elections/{id}/start-voting` — REGISTRATION → VOTING
- `POST /api/elections/{id}/complete` — VOTING → COMPLETED

## 이유
VOTING 전환 시에는 단순 시간 경과가 아닌 사전 작업이 필요하다.

1. 등록된 유권자 목록으로 Merkle root 계산
2. 스마트 컨트랙트 배포 (Hardhat 스크립트)
3. 컨트랙트에 Merkle root 등록

이 과정이 완료된 후에야 투표를 시작할 수 있으므로, 자동 전환은 적합하지 않다.
관리자가 위 작업 완료 후 직접 API를 호출하는 방식이 더 안전하다.

## 트레이드오프
- 관리자가 직접 개입해야 하므로 실수로 전환을 누락할 수 있다.
- 자동화가 필요하다면 컨트랙트 배포 자동화가 먼저 완성된 후 추가할 수 있다.

## 컨트랙트 배포 역할 분리
Spring Boot는 비즈니스 로직과 ZK proof 검증에 집중하고,
컨트랙트 배포는 기존 Node.js + Hardhat 스크립트가 담당한다.
Spring Boot는 배포 결과인 `contractAddress`만 받아서 저장한다.

이렇게 역할을 분리한 이유는 Java에서 Hardhat을 직접 실행하는 것이
환경 의존성이 높고 구조적으로 부적절하기 때문이다.

> **변경**: `merkleRoot`는 Admin이 전달하지 않는다.
> VOTING 전환 시 서버가 DB의 유권자 목록을 기반으로 직접 계산한다. → ADR-007 참고
