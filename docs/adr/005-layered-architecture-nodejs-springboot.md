# ADR-005: Node.js와 Spring Boot의 역할 분리

## 상태
채택

## 배경
기존 Node.js 서버를 Spring Boot로 마이그레이션하면서,
ZK/블록체인 관련 로직을 어떻게 처리할지 결정이 필요했다.

## 결정
역할을 두 레이어로 분리한다.

| 레이어 | 기술 | 담당 역할 |
|--------|------|-----------|
| 비즈니스 로직 | Spring Boot | 인증/권한, 선거 관리, 유권자 등록 |
| ZK/블록체인 | Node.js (기존 유지) | Merkle tree 계산, 컨트랙트 배포, proof 생성, 가스 릴레이 |

## 이유

ZK/블록체인 레이어는 다음 도구에 의존한다.

- **circomlibjs**: Poseidon hash 구현 (Java 라이브러리 없음)
- **fixed-merkle-tree**: Merkle tree 구현
- **Hardhat**: 스마트 컨트랙트 배포 프레임워크
- **ethers.js**: 블록체인 트랜잭션 전송

이 도구들은 Node.js 생태계에 특화되어 있어 Java로 이식하는 것이 부적절하다.
억지로 Java로 옮기면 구현 복잡도만 높아지고 안정성이 떨어진다.

반면 인증, 권한 관리, 비즈니스 로직은 Spring Boot + Spring Security가 더 적합하다.

## 투표 흐름에서의 역할

```
[Node.js]
  POST /proof       → Merkle proof 생성 (Poseidon hash 필요)
  POST /submit      → 스마트 컨트랙트에 ZK proof 제출 (gas relayer)

[Spring Boot]
  POST /api/elections                    → 선거 생성
  POST /api/elections/{id}/voters        → 유권자 사전 등록
  POST /api/elections/{id}/voters/register → 유저 self-register
  POST /api/elections/{id}/start-voting  → 투표 시작 (merkleRoot, contractAddress 저장)
  POST /api/elections/{id}/complete      → 투표 완료
```

## 트레이드오프
- 두 서버를 모두 운영해야 한다.
- 하지만 각 레이어가 가장 잘 할 수 있는 역할을 담당하므로 구조가 명확하다.
- ZK proof 검증은 스마트 컨트랙트가 온체인에서 처리하므로,
  Spring Boot와 Node.js 중 어느 쪽도 직접 검증할 필요가 없다.
