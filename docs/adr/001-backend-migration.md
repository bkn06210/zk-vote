# ADR-001: 백엔드 마이그레이션 (Node.js + Supabase → Spring Boot + MySQL)

## 상태
채택

## 배경
기존 백엔드는 Node.js/Express + Supabase(PostgreSQL) 조합으로 구성되어 있었다.
Supabase가 인증(Auth), DB, 캐시를 모두 관리하는 구조였기 때문에 각 계층에 대한 직접적인 제어가 어려웠다.
졸업 프로젝트 특성상 시스템의 각 구성 요소를 직접 설계하고 구현하는 경험이 필요하다고 판단했다.

## 결정
백엔드를 Spring Boot + MySQL로 마이그레이션한다.

| 항목 | 기존 | 변경 |
|------|------|------|
| 런타임 | Node.js/Express | Spring Boot 4.0 (Java 21) |
| 데이터베이스 | Supabase (PostgreSQL) | MySQL 8.0 |
| 인증 | Supabase Auth | Spring Security + JWT 직접 구현 |
| 캐시 | AWS ElastiCache (Redis) | 유지 |
| 빌드 도구 | npm | Gradle |

## 이유
- Spring Boot + JPA는 엔터프라이즈 환경에서 표준적으로 사용되는 스택이며 레이어(Controller/Service/Repository) 분리가 명확하다.
- Supabase Auth에 대한 의존성을 제거하고 인증 로직을 직접 구현함으로써 JWT 흐름을 완전히 제어할 수 있다.
- MySQL은 국내 백엔드 환경에서 가장 많이 사용되는 RDB로, 운영 경험이 중요하다.

## 트레이드오프
- Supabase가 제공하던 Row Level Security(RLS)가 사라지므로 권한 제어를 서비스 레이어에서 직접 처리해야 한다.
- Node.js 대비 초기 설정 코드량이 많다.
- Redis 캐시(Merkle tree, 제출 티켓)는 기존 로직을 그대로 유지할 수 없어 Spring 방식으로 재구현이 필요하다.
