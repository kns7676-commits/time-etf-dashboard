# 통합 ETF 프로젝트

앞으로의 기준 폴더는 `E:\AI program\time-etf-dashboard`입니다.

## 기본 자동화

`.github/workflows/dashboard.yml` 하나가 매일 한국시간 06:00에 공식 보유종목 수집, 상황판 생성, GitHub Pages 게시, 텔레그램 링크 발송을 순서대로 수행합니다. 게시 실패 시 링크를 보내지 않습니다. GitHub 예약은 지연될 수 있습니다.

GitHub 저장소의 Actions secrets에 `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`가 필요합니다. 통합 코드를 GitHub에 반영하고 상황판 배포를 확인했습니다. 텔레그램 시크릿 등록 및 실제 발송 검증은 MIGRATION-STATUS.md를 참고하세요. 전환할 때 기존 time-ai-weekly 저장소 등에서 돌아가는 알림 예약을 중지하여 중복 발송을 막아야 합니다. 기존 time-ai-weekly의 링크 발송 예약은 통합 발송 검증 전까지 유지합니다.

보유 이력 `state/cumulative.json`은 기존 상황판 기록을 그대로 사용합니다. 기록 저장은 수집 후 이루어지므로 알림 실패 시에도 수집된 이력은 유지됩니다. 실패한 알림은 refresh=false로 워크플로를 수동 실행하여 재전송할 수 있습니다.

## 실행

- `npm test`: 상황판과 통합 보고서 및 링크 발송 테스트 (외부 발송 없음)
- `npm run refresh`: 공식 보유종목 수집 및 이력 저장
- `npm run build`: 상황판 생성 (외부 시세 조회 포함)
- `npm run send`: 게시된 상황판 URL 발송. 환경변수로 Telegram 설정 필요. DASHBOARD_URL로 주소 변경 가능.
- `npm run report:original`: 초기 TIME AI 보고서 미리보기
- `npm run report:daily`: TIME ETF 5개 일간 비교 미리보기
- `npm run report:extended`: 운용사별 순위 및 누적 보고서 미리보기

보고서 명령은 기본적으로 `--dry-run`입니다. 기존 기능과 호환성을 보존하기 위해 각 모듈의 소스, 테스트, 공식 자료 샘플, 비교 상태를 reports 아래에 분리했습니다. 모듈은 각자의 디렉터리를 작업 경로로 사용하므로 상태와 출력이 섞이지 않습니다. 각 모듈 테스트는 해당 디렉터리에서 `node --test`로 실행합니다. 원본 폴더는 수정하거나 삭제하지 않았습니다.

## 통합 위치

| 이전 폴더 | 통합 위치 | 역할 |
| --- | --- | --- |
| time-etf-dashboard | 프로젝트 루트 | 기본 상황판, 현재 보유 이력, 게시 및 링크 알림 |
| time-ai-weekly | reports/original | 초기 텔레그램 보고서 |
| claude_time_ai_weekly | reports/daily | 5개 ETF 일간 증감 비교 |
| codex_time_ai_weekly | reports/extended | 운용사별 순위 및 누적 보고서 |

이전 모듈의 README는 당시 설명으로 보존했습니다. 운영 기준은 이 문서와 루트 워크플로입니다. 이전 폴더의 .git, .github 워크플로, output, 계정 비밀 설정은 가져오지 않았습니다. 게시 대상은 output/site뿐이며 reports와 state는 게시하지 않습니다.
