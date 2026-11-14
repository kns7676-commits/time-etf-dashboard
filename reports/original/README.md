# TIME 글로벌AI 주간 텔레그램 알림

상태: 프로그램과 예약 설정 파일 준비 완료. 계정 연결·클라우드 배포·실제 발송은 아직 하지 않았습니다.

## 알림 내용

- 공식 상품 페이지의 전체 구성종목과 비중, 실제 보유종목 기준일
- 이전 성공 발송 대비 신규 편입·편출, 비중 변화 상위 5개(%p)
- 상위 10개 요약과 전체 목록을 담은 텍스트 파일
- 첫 발송은 비교 기준 생성. 이후 두 스냅샷 사이의 변화만 비교하며 주중 모든 거래를 추적하지 않습니다.
- 비중 변화는 실제 매수·매도 판단이 아닙니다. 선물·ETF·현금도 원자료대로 표시합니다.
- 7일 초과 오래된 자료, 누락된 표, 비중 합계 오류는 정상 보고서로 발송하지 않습니다.

## 텔레그램 연결

1. 공식 @BotFather에서 `/newbot`으로 개인 봇을 만듭니다.
2. 생성된 봇과의 대화에서 `/start`를 보냅니다.
3. PowerShell에서 이 폴더로 이동하고 `./connect-telegram.ps1`을 실행합니다. 토큰은 가려진 입력란에만 입력합니다. 토큰을 저장하거나 출력하지 않습니다.
4. 표시된 본인의 private chat ID를 확인합니다. 이 스크립트는 메시지를 발송하지 않습니다.

## GitHub Actions (PC가 꺼져 있어도 실행)

1. 개인 GitHub 계정에 비공개 저장소를 만들고 이 프로젝트를 올립니다. `.env`, `source.html`, `output`은 올리지 않습니다.
2. 저장소 Settings → Secrets and variables → Actions → New repository secret에 다음을 등록합니다.
   - `TELEGRAM_BOT_TOKEN`: BotFather 발급 토큰
   - `TELEGRAM_CHAT_ID`: 위에서 확인한 본인 수신 chat ID
3. Actions에서 `TIME AI weekly Telegram report` → Run workflow를 실행해 첫 알림 수신을 확인합니다.
4. 워크플로 파일이 기본 브랜치에 있어야 예약 실행됩니다. 매주 월요일 00:00 UTC = 한국시간 09:00입니다.

GitHub 예약은 정시 도착을 보장하지 않으며 혼잡 시 지연 또는 실행 누락 가능성이 있습니다. 실패 알림 설정과 Actions 실행 기록을 확인하세요. 이용 한도·요금은 계정 플랜에 따릅니다.

워크플로는 성공 발송한 비교 자료를 `state/latest.json`으로 커밋합니다. 저장소 쓰기 권한이 필요합니다. 발송 후 상태 저장이 실패하면 다음 알림은 더 오래된 기준과 비교할 수 있으므로 Actions 오류를 확인하세요. 수동 재실행은 메시지를 다시 보냅니다.

## 로컬 확인

Node.js 22 이상. 외부 패키지를 설치하지 않습니다.

```powershell
node --test
node weekly.mjs --dry-run
```

`output/preview.txt`를 확인합니다. 미리보기는 발송하거나 비교 기준을 변경하지 않습니다.

실제 발송에는 위 두 환경변수가 필요합니다. `node weekly.mjs`가 발송 명령입니다.

공식 출처: https://timeetf.co.kr/m11_view.php?idx=6

예약 문서: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule
