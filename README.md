# 통합 ETF 프로젝트

로컬 보고서 소스와 기능은 이 폴더에 통합했습니다. 원격 운영은 기존 두 GitHub 저장소를 유지합니다.

- time-etf-dashboard: 매일 한국시간 06:00 예약으로 자료 수집, 이력 저장, 상황판 게시.
- time-ai-weekly: 매일 한국시간 06:10 예약으로 기존 설정을 사용해 텔레그램 링크 발송.

GitHub 예약은 지연될 수 있습니다. 기존 텔레그램 설정을 재등록할 필요는 없습니다. 이 저장소의 자동 워크플로에는 텔레그램 발송 단계가 없습니다. 기존 알림 워크플로는 유지합니다.

## 실행

- npm test: 통합 테스트 79개. 백업 폴더는 테스트 대상에서 제외.
- npm run refresh: 공식 보유종목 수집 및 이력 저장.
- npm run build: 상황판 생성. 외부 시세 조회 포함.
- npm run report:original: 초기 보고서 미리보기.
- npm run report:daily: TIME ETF 5개 일간 보고서 미리보기.
- npm run report:extended: 확장 보고서 미리보기.
- npm run send: 별도 수동 발송 도구. 환경변수 설정이 필요하며 자동 운영에는 사용하지 않음.

이전 세 버전은 reports/original, reports/daily, reports/extended에 보존했습니다. 각 모듈은 별도의 상태와 출력 경로를 사용합니다. 기존 원본 폴더는 삭제하지 않았습니다.

전체 원본 백업은 backups/pre-consolidation-20261114-083506/에 보관하고 파일별 해시를 검증했습니다. 현재 운영 중인 알림 저장소도 backups/remote-time-ai-weekly-20261114에 백업했습니다. backups는 GitHub 업로드에서 제외됩니다. 게시 대상은 output/site뿐입니다.
