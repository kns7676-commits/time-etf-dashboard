# TIME ETF 보유종목 일간 텔레그램 알림

매일 아침 06:10(한국시간)에 지정한 TIME ETF 5개 상품의 상위 10종목을 직전 발송분과 비교해 텔레그램으로 보냅니다.

## 보고서 내용

대상 상품은 아래 순서로 고정합니다.

1. TIME 글로벌AI인공지능액티브
2. TIME 미국나스닥100액티브
3. TIME 코스피액티브
4. TIME 코리아밸류업액티브
5. TIME 코스닥액티브

- 상품마다 상위 10종목을 순위·종목명·비중(%)·증감으로 표시합니다. 증가는 빨강, 감소는 파랑, 직전 자료에 없던 종목은 `신규` 배지입니다.
- 증감 기준은 **직전에 발송에 성공한 자료**입니다. 첫 발송에는 비교 대상이 없으므로 공식 페이지에서 1개월 전 날짜의 보유내역을 받아 비교합니다.
- 어떤 이유로 발송에 실패하면 비교 기준이 갱신되지 않습니다. 따라서 다음 발송은 자동으로 그 이전 발송분(예: 이틀 전)과 비교합니다.
- 양쪽 기준일을 항상 함께 표기합니다. 예: `오늘 2026-09-11`, `* 증감: 2026-08-11 (1개월 전) 대비 비중 변화`.
- 직전 상위 10종목 중 현재 보유내역에서 빠진 종목은 표 아래 `편출`로 적습니다.
- 비중은 공식 페이지 기준일 기준이며 수익 기여도가 아닙니다. 선물·ETF·현금도 원자료대로 표시합니다.

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
4. 워크플로 파일이 기본 브랜치에 있어야 예약 실행됩니다. 매일 21:10 UTC = 한국시간 06:10입니다.

예약 발송과 별도로 언제든 Run workflow로 즉시 발송할 수 있습니다. GitHub 예약은 정시 도착을 보장하지 않으며 혼잡 시 지연 또는 실행 누락 가능성이 있습니다. 실패 알림 설정과 Actions 실행 기록을 확인하세요. 이용 한도·요금은 계정 플랜에 따릅니다.

워크플로는 발송에 성공한 자료를 `state/daily.json`으로 커밋합니다. 이 파일이 다음 발송의 비교 기준입니다. 저장소 쓰기 권한이 필요합니다. 발송 후 상태 저장이 실패하면 다음 알림이 더 오래된 기준과 비교하므로 Actions 오류를 확인하세요.

## 로컬 확인

Node.js 22 이상. 외부 패키지를 설치하지 않습니다.

```powershell
node --test
node weekly.mjs --dry-run
```

`output/preview.txt`를 확인합니다. 미리보기는 발송하거나 비교 기준을 변경하지 않습니다.

## 실행 옵션

| 명령 | 동작 |
| --- | --- |
| `node weekly.mjs --dry-run` | 자료를 모아 `output/`에만 저장합니다. 발송하지 않고 비교 기준도 바꾸지 않습니다. |
| `node weekly.mjs --telegram` | 텔레그램으로 발송하고 비교 기준을 갱신합니다. |
| `node weekly.mjs` | `--telegram`과 같습니다. GitHub Actions가 쓰는 형태입니다. |

`--dry-run`과 `--telegram`은 함께 쓸 수 없고, 그 밖의 옵션은 자료를 받기 전에 오류로 중단합니다. 오타 난 옵션이 실제 발송으로 이어지지 않습니다.

발송에는 `TELEGRAM_BOT_TOKEN`과 `TELEGRAM_CHAT_ID`가 필요합니다. 둘 중 하나라도 없으면 자료를 받기 전에 중단합니다. 이 폴더에 `.env` 파일을 두면 로컬 발송 시 읽습니다. 이미 설정된 환경변수가 `.env` 값보다 우선합니다.

```
TELEGRAM_BOT_TOKEN=봇토큰
TELEGRAM_CHAT_ID=본인chatID
```

`.env`는 `.gitignore`에 있어 저장소에 올라가지 않습니다. 토큰을 커밋하거나 워크플로 파일에 적지 마세요. 클라우드 발송은 저장소 Secrets를 씁니다.

공식 출처: https://timeetf.co.kr/m11_view.php?idx=6

예약 문서: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule
