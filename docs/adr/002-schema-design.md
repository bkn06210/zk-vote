# ADR-002: MySQL 스키마 설계

## 상태
채택

## 배경
기존 Supabase 스키마를 MySQL로 옮기면서 몇 가지 구조적 결정이 필요했다.

## 결정 사항

### 1. users 테이블 신설 (Supabase Auth 대체)
기존에는 사용자 계정을 Supabase Auth가 관리하고, `admins` 테이블에는 user_id만 저장했다.
Spring Boot로 오면서 직접 사용자 정보를 관리해야 하므로 `users` 테이블을 새로 만들고,
admin 여부는 `role ENUM('USER', 'ADMIN')` 컬럼으로 통합했다.

**기존**
```
Supabase Auth (users) ← admins (id만 저장)
```
**변경**
```
users (id, email, password, name, role)
```

### 2. elections.status ENUM 도입
기존에는 선거 상태를 타임스탬프 조합 + `completed` boolean으로 판단했다.

```
등록 중 → registration_start < now < registration_end
투표 중 → voting_start < now < voting_end
완료    → completed = true
```

이 방식은 조건 분기가 복잡하고 잘못된 상태 조합(예: voting_end가 지났는데 completed=false)이 생길 수 있다.
`status ENUM('REGISTRATION', 'VOTING', 'COMPLETED')`를 추가하여 상태를 단일 컬럼으로 명확히 관리한다.
타임스탬프 컬럼들은 이력 목적으로 유지한다.

### 3. UUID를 애플리케이션에서 생성
`elections`, `voters`의 id는 CHAR(36) UUID 형식을 유지하되, `DEFAULT (UUID())`를 사용하지 않는다.
`DEFAULT (UUID())` 문법은 MySQL 8.0.13 이상에서만 지원되며 환경에 따라 동작이 다를 수 있다.
UUID 생성은 JPA(`@UuidGenerator`)에서 담당한다.

### 4. candidates 컬럼 JSON 타입 사용
PostgreSQL의 배열(`text[]`) 대신 MySQL의 `JSON` 타입을 사용한다.
JPA에서는 `AttributeConverter`로 `List<String> ↔ JSON` 변환을 처리한다.

## 알려진 한계

### user_secret 평문 저장
`voters.user_secret`은 ZK 증명 생성의 핵심 값으로, DB에 평문으로 저장된다.
DB가 탈취되면 이론적으로 누가 무엇에 투표했는지 역추적이 가능해져 익명성이 깨진다.
단, 서버가 Merkle proof 생성 시 원본 값을 필요로 하기 때문에 단방향 해시로 대체하는 것이 구조적으로 불가능하다.
이는 원본 시스템 설계의 한계이며, 신뢰 가능한 서버 운영 환경을 전제로 한다.

## 최종 테이블 목록

| 테이블 | 설명 |
|--------|------|
| `users` | 사용자 계정 및 권한 |
| `admin_invitations` | 관리자 사전 허용 이메일 |
| `elections` | 선거 정보 및 상태 |
| `voters` | 선거별 유권자 (사전등록 → 자기등록 2단계) |
