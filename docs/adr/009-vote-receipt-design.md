# ADR-009: 서버 위조 방지를 위한 클라이언트 사이드 Vote Receipt 설계

## 상태
채택

## 배경

ZK proof는 두 가지를 보장한다.

1. **익명성**: 서버가 "누가 누구에게 투표했는가"를 알 수 없다.
2. **무결성**: 유효하지 않은 proof를 제출할 수 없다.

그런데 ZK proof가 보장하지 않는 것이 있다. **서버가 검증 후 기록 단계에서 `vote_index`를 바꾸는 것.**

`/submit` 엔드포인트는 `proof`와 `publicSignals`를 받는다.
`publicSignals[1]` = `vote_index`로, 유권자가 선택한 후보의 인덱스다.
서버는 이 값을 검증하지만, DB에 다른 숫자로 저장할 수 있다.

ZK proof는 "이 사람이 합법적으로 X번 후보에게 투표했다"는 것을 증명하지,
"서버가 그 결과를 정직하게 기록했다"는 것까지 보장하지 않는다.

## 선택지

### A. 서버 신뢰 (아무것도 안 함)
유권자가 서버를 믿어야 한다.
전통적인 전자투표와 같은 수준으로, ZK의 의미가 퇴색된다.

### B. 온체인 검증 (모든 투표를 트랜잭션으로)
`vote_index`까지 스마트 컨트랙트가 검증하면 서버 위조가 불가능하다.
단, ADR-008에서 결론 낸 것처럼 가스비 문제로 현실적이지 않다.

### C. 클라이언트 사이드 Vote Receipt
유권자가 투표 전 **자신만 아는 nonce**를 입력하고,
클라이언트가 다음을 계산하여 서버에 같이 제출한다.

```
voteReceipt = SHA-256(nullifierHash : nonce : candidateIndex)
```

이 receipt를 온체인 또는 DB에 저장한다.
나중에 유권자가 자신의 nonce로 영수증을 재계산해 일치 여부를 확인할 수 있다.

## 결정

**C. 클라이언트 사이드 Vote Receipt**를 채택한다.

## 이유

**서버가 위조할 수 없는 이유**:

- `nonce`는 서버에 저장되지 않는다. 유권자만 알고 있다.
- 서버가 `vote_index`를 1에서 0으로 바꿔 저장했다면, receipt가 `SHA-256(nullifier:nonce:0)`이어야 하는데, 서버는 `nonce`를 모르므로 이 값을 계산할 수 없다.
- 결국 receipt가 맞지 않아 유권자가 검증 시 위조를 감지할 수 있다.

**ZK의 역할 분리**:

| 보장 항목 | 수단 |
|---|---|
| 유권자가 합법적인 등록자인가 | ZK proof (Merkle 포함 증명) |
| 동일인이 두 번 투표하지 않았는가 | ZK proof (nullifier_hash) |
| 서버가 기록을 위조하지 않았는가 | Vote Receipt + nonce |

세 가지 위협이 서로 다른 수단으로 분리되어 처리된다.

## 구현

```javascript
// 클라이언트 (VotePage.js) — 서버 제출 직전 계산
const voteReceipt = await SHA256(`${nullifierHash}:${nonce}:${candidateIndex}`);

// 서버에 함께 전송
POST /api/elections/{id}/submit {
  proof, publicSignals, submissionTicket, voteReceipt
}
```

- `voteReceipt`는 DB의 `vote_records.vote_receipt`에 저장된다.
- 온체인 기록이 활성화된 경우 스마트 컨트랙트에도 기록된다.
- 유권자에게 nonce를 영수증과 함께 화면에 표시하고 보관을 안내한다.

## 트레이드오프

**한계**:
- nonce를 분실하면 영수증을 검증할 수 없다. 서버도 복구 방법이 없다.
- 유권자가 nonce를 저장해야 한다는 UX 부담이 생긴다.
- receipt는 `(nullifierHash, nonce, candidateIndex)`의 결합이므로, nonce만 안전하게 보관하면 익명성은 유지된다.

**익명성과의 관계**:
- nullifierHash는 공개되어 있어도 user_secret과 연결할 수 없다.
- nonce는 유권자만 알고, 서버는 알 수 없다.
- 따라서 receipt를 공개해도 "누가 누구에게 투표했는가"는 드러나지 않는다.
