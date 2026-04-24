# ADR-006: userSecret 설계 (생성 방식 및 저장 형식)

## 상태
채택

## 배경
ZK proof의 핵심 private input인 `user_secret`을 어떻게 생성하고 저장할지 결정이 필요했다.

## 결정

### 생성 방식
```
user_secret = BigInteger(SHA-256(userId + SECRET_SALT)).toString()
```

1. `userId + SECRET_SALT`를 SHA-256으로 해시
2. 결과 hex string을 BigInteger 십진수 문자열로 변환

### 저장 형식
hex string이 아닌 **BigInteger 십진수 문자열**로 저장한다.

## 이유

**BigInteger 변환이 필요한 이유**

Circom ZK 회로는 `bn128` 유한체(finite field) 위에서 동작한다.
회로의 모든 입력은 반드시 **정수(field element)** 여야 한다.
SHA-256 결과를 hex string 그대로 저장하면 회로에 직접 입력할 수 없어서
ZK proof 생성 단계에서 타입 불일치 오류가 발생한다.
BigInteger 십진수로 변환해두면 별도 변환 없이 바로 회로 입력으로 사용할 수 있다.

**결정론적(Deterministic) 생성**

같은 userId와 salt면 항상 같은 secret이 생성된다.
서버가 secret을 별도로 관리하지 않아도 되고,
유저가 재등록하더라도 동일한 secret을 보장한다.

**SECRET_SALT 사용 이유**

userId만으로는 secret이 예측 가능하다.
salt를 추가해 무작위성을 확보하고, 서버 외부에서 역산을 어렵게 한다.

## 알려진 한계
`user_secret`은 DB에 평문으로 저장된다.
DB가 탈취되면 이론적으로 역추적이 가능해 익명성이 깨질 수 있다.
서버가 Merkle proof 생성 시 원본 값을 필요로 하므로 단방향 해시로 대체하는 것이 구조적으로 불가능하다.
신뢰 가능한 서버 운영 환경을 전제로 한다.

## Poseidon hash와의 관계
`user_secret` 자체는 Merkle tree의 leaf가 아니다.
Node.js에서 `leaf = Poseidon(user_secret)`으로 해시한 값이 leaf가 된다.
이렇게 하면 leaf만 공개되더라도 원본 secret을 역산할 수 없어 프라이버시가 보장된다.
