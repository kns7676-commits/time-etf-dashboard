# ETF 상황판 및 텔레그램 주소 알림

보고서는 GitHub Pages 상황판에 표시합니다. 텔레그램에는 상황판 주소 한 줄만 전송하며 본문, 첨부파일, 링크 미리보기를 보내지 않습니다.

첫 화면에는 TIME ETF 5개의 날짜별 실제 보유 비중(%) 그래프를 표시합니다. 현재 비중 순으로 10종목씩 묶고 선마다 다른 색을 사용합니다. 범례에 현재 비중을 표시하며 편입·편출 표시와 날짜별 수치표를 제공합니다. `state/cumulative.json`의 기존 기록을 이어 사용하고 발송 성공 후 새 기록을 저장합니다. 기간별 순위 표는 그래프 아래에서 펼쳐 확인합니다.

## GitHub 설정

1. 이 프로젝트를 GitHub 저장소에 올립니다.
2. Settings → Pages → Build and deployment → Source에서 GitHub Actions를 선택합니다. 저장소에서 Pages를 사용할 수 있어야 합니다.
3. Actions secrets에 `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`를 등록합니다. 봇 연결은 `connect-telegram.ps1`을 참고하세요.
4. Actions에서 `ETF dashboard and Telegram link`를 수동 실행합니다.

자료 수집 → 상황판 생성 → Pages 게시 성공 → 주소 발송 → 비교 기준 저장 순서입니다. 텔레그램 전송 주소는 https://kns7676-commits.github.io/time-etf-dashboard/all-holdings/ 입니다. 매일 한국시간 06:00에 예약되며 GitHub 실행 상황에 따라 지연될 수 있습니다.

게시 대상은 `output/site`의 상황판뿐입니다. 비교 상태와 토큰은 게시하지 않습니다. 일반적인 GitHub Pages 상황판은 공개 웹페이지입니다.

## 표시 내용 및 실패 처리

기간별(1주·1개월·3개월) 수익률 상위 5개, 운용사별 표, 현재 구성종목 비중과 이전 성공 알림 대비 변화를 표시합니다. 현재 비중은 수익 기여도가 아닙니다.

운용사 조회 실패 또는 자료 부족 시 해당 운용사를 제외합니다. 양쪽 모두 실패하면 게시와 발송을 중단하고 이전 비교 자료를 보존합니다. 게시 또는 발송 실패 시 비교 기준을 갱신하지 않습니다.

`resend_saved`를 선택하면 저장 자료로 상황판을 다시 게시하며 저장 자료임을 표시합니다. 수동 재실행은 주소를 다시 발송합니다.

## 로컬 확인

Node.js 22 이상에서:

```powershell
node --test
node weekly.mjs --dry-run
```

`output/site/index.html`을 열어 상황판을 확인합니다. 미리보기는 발송하거나 비교 기준을 바꾸지 않습니다.

직접 게시할 때는 `node weekly.mjs --build`로 생성한 `output/site`를 먼저 게시한 뒤, 텔레그램 환경변수를 설정하고 `node notify.mjs`를 실행합니다. 기본 전송 주소는 위의 `/all-holdings/` 주소이며, `DASHBOARD_URL` 환경변수로 변경할 수 있습니다. 알림 스크립트는 게시를 수행하지 않습니다.

현재 로컬 코드와 배포 설정만 준비되어 있으며 실제 GitHub 배포와 텔레그램 발송은 별도 실행이 필요합니다.

[GitHub Pages 워크플로 문서](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
