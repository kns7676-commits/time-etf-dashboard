# 통합 ETF 프로젝트

로컬 보고서 소스와 기능은 이 폴더에 통합했습니다. 원격 운영은 time-etf-dashboard 저장소의 단일 워크플로로 통합했습니다.

- time-etf-dashboard: 매일 한국시간 06:00 예약으로 자료 수집, 이력 저장, 상황판 게시 후 텔레그램 링크 발송.
- time-ai-weekly: 기존 발송 워크플로는 중복 방지를 위해 비활성화. 저장소는 보존.

GitHub 예약은 지연될 수 있습니다. 이 저장소에 Telegram 시크릿 두 개를 등록하고 발송 성공을 확인했습니다. 게시가 성공한 뒤에만 링크를 발송합니다.

## 실행

- npm test: 통합 테스트 79개. 백업 폴더는 테스트 대상에서 제외.
- npm run refresh: 공식 보유종목 수집 및 이력 저장.
- npm run build: 상황판 생성. 외부 시세 조회 포함.
- npm run report:original: 초기 보고서 미리보기.
- npm run report:daily: TIME ETF 5개 일간 보고서 미리보기.
- npm run report:extended: 확장 보고서 미리보기.
- npm run send: 링크 수동 발송. 환경변수 설정 필요. 자동 워크플로도 같은 notify.mjs를 사용.

이전 세 버전은 reports/original, reports/daily, reports/extended에 보존했습니다. 각 모듈은 별도의 상태와 출력 경로를 사용합니다. 기존 원본 폴더는 삭제하지 않았습니다.

전체 원본 백업은 backups/pre-consolidation-20261114-083506/에 보관하고 파일별 해시를 검증했습니다. 현재 운영 중인 알림 저장소도 backups/remote-time-ai-weekly-20261114에 백업했습니다. backups는 GitHub 업로드에서 제외됩니다. 게시 대상은 output/site뿐입니다.
