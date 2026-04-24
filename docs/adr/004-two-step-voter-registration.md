# ADR-004: 2단계 유권자 등록 설계

## 상태
채택

## 배경
유권자 등록을 어떻게 처리할지 결정이 필요했다.
단순히 관리자가 등록하거나, 유저가 직접 등록하거나, 두 단계로 나누는 방식 중 선택해야 했다.

## 결정
관리자 사전 등록 → 유저 self-register 2단계로 처리한다.

**1단계: 관리자 사전 등록 (bulk register)**
- 관리자가 허용할 이메일 목록을 DB에 저장
- 이 시점에는 `user_id`, `user_secret` 없음

**2단계: 유저 self-register**
- 유저가 로그인 후 직접 등록
- 이 시점에 `user_secret = SHA-256(userId + salt)` 생성
- `user_secret`이 Merkle tree leaf의 preimage가 됨

## 이유

`user_secret`은 `userId` 기반으로 생성된다.
관리자는 이메일만 알고 있을 뿐, 해당 유저의 `userId`를 알 수 없다.
따라서 유저가 직접 로그인해서 본인임을 인증한 후에야 `userId`를 확인할 수 있고,
그 시점에 secret을 생성하는 구조가 필요하다.

또한 익명성 보장 측면에서도 의미가 있다.
관리자가 사전 등록 시점에 이미 유저 계정과 연결하면,
관리자가 "누가 등록했는지"를 알 수 있게 된다.
2단계 구조에서는 secret이 본인에게만 귀속되므로 익명성이 보장된다.

## 흐름

```
관리자: POST /api/elections/{id}/voters
  → email만 DB에 저장 (user_id, user_secret = null)

유저: POST /api/elections/{id}/voters/register
  → 로그인된 userId로 user_secret 생성
  → voter 레코드 업데이트
```

## 트레이드오프
- 유저가 2번 행동해야 해서 UX가 다소 복잡하다.
- 하지만 익명성과 보안을 위해 필요한 구조다.
