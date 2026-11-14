# 운영 상태 (2026-11-14)

최신 화면 통합: 커밋 bd5be75, 실행 https://github.com/kns7676-commits/time-etf-dashboard/actions/runs/43548249470 성공. AI / 바이오 / 미국대표 ETF 세 탭을 게시함. BIO는 Netlify용 index.html과 동일한 BIO ETF MONITOR 헤더, 제목·설명, Pretendard 글자체, 간격을 줄인 표, 정규화 순위, 종목별 그래프 및 이동 버튼을 사용하며 SOX는 제외. 미국대표는 요청한 TIME 2개와 KoAct 3개를 동일한 디자인으로 표시. 매일 두 비교 데이터를 검증한 뒤 이력을 각각 저장하고 게시 후 Telegram 링크 전송. 테스트 94개 통과. 공개 AI·BIO·미국대표 페이지 모두 HTTP 200 및 실제 HTML 내용, 세 탭, 글자체 내장, ETF 순서, 보정 합계 100.00%, 이동 링크 검증 완료. 미국대표 이력은 2026-11-14부터 누적. 두 비교 자료 기준일은 2026-11-13. 재사용 방법은 AGENTS.md에 기록함.

- 로컬 소스 통합 및 전체 테스트 79개 통과.
- 원본 세 폴더의 782개 파일 전체 백업과 SHA-256 검증 완료.
- 백업: backups/pre-consolidation-20261114-083506/.
- 통합 상황판 배포 성공: 실행 43533403425. 공개 페이지 HTTP 200과 차트 확인.
- 기존 time-ai-weekly 링크 발송: 11월 9~13일 실행 성공 확인. 사용자도 매일 수신 확인.
- 사용자가 시크릿 재등록을 취소하여 기존 발송 구조 유지.
- time-etf-dashboard의 자동 발송 단계 제거. 상황판 갱신과 게시만 담당.
- time-ai-weekly의 기존 예약과 시크릿 유지. 중지하지 않음.
- 원격 운영 저장소는 두 개 유지. 로컬 코드 통합과 구분됨.
- 원본 폴더 삭제는 실행하지 않음.

2026-11-14 추가 검증: 통합 저장소에 시크릿 두 개 등록됨. 실행 43535011060에서 배포 성공, Telegram API 403(봇의 대화방 접근 거부)으로 발송 실패. 기존 발송 예약은 유지. 통합 저장소의 Telegram 발송은 수동 실행에만 한정하여 예약 작업의 발송 실패 및 중복 발송을 방지. 시크릿 값은 열람하거나 노출하지 않음.

최종 전환: TELEGRAM_CHAT_ID 수정 후 실행 43535900007에서 테스트 79개, 게시, Telegram 링크 전송 모두 성공. 통합 워크플로의 예약 발송을 활성화하고 기존 time-ai-weekly 워크플로 356157165를 중지함. 사용자 단말 수신 확인은 별도 대기. 원본 폴더 및 전체 백업 보존.

2026-11-14 화면 변경: 커밋 477f2fc에서 필라델피아 반도체 지수를 최상단으로 이동하고 바로 아래 AI / 바이오 두 탭을 배치함. AI는 기존 5개 ETF 화면 유지, 바이오는 준비 화면. 루트 및 ai/, bio/ 생성과 HTML 배치 검증 성공. 로컬 및 GitHub 테스트 79개 통과. 실행 https://github.com/kns7676-commits/time-etf-dashboard/actions/runs/43540555879 에서 게시 및 Telegram 링크 전송 단계 성공. 기존 GitHub Pages 주소 유지. Windows 실행 방법과 인증 환경은 AGENTS.md에 기록함.

2026-11-14 바이오 기능 추가: 커밋 518a291. 준비 화면을 FunETF 4개 ETF 구성종목 TOP10 비교표, ETF별 TOP10 합계를 100으로 보정한 동일가중 평균 순위표, 종목 선택 및 ETF별 실제 비중 날짜 그래프로 교체함. 관측 이력은 state/bio-comparison-history.json에 오늘부터 누적하며 같은 날 재확인은 교체. TOP10 밖은 실제 비중 0으로 간주하지 않고 그래프를 끊음. 매일 발송 전 FunETF 수집·검증→이력 저장→빌드→게시→텔레그램 발송 순서. 수집 실패 또는 당일 미확인 자료는 게시·발송 중단. 새 링크와 탭에 버전 쿼리를 붙여 이전 캐시 재사용 방지. 실행 https://github.com/kns7676-commits/time-etf-dashboard/actions/runs/43542032376 에서 테스트 89개, 수집, 게시, Telegram 전송 모두 성공. 공개 바이오 페이지 HTTP 200, 원본 40개 항목, 보정 순위 25종목 및 선택 그래프 코드 확인. 기준일 2026-11-13, 확인 시각 2026-11-14T01:41:14.733Z. 재사용 절차는 AGENTS.md에 기록함.

2026-11-14 KOSPI·KOSDAQ 탭 및 추세 이력 연결: 커밋 c7154a7, 실행 https://github.com/kns7676-commits/time-etf-dashboard/actions/runs/43553793396 성공(refresh=false). 테스트, 바이오·미국대표·KOSPI·KOSDAQ 비교 수집, 빌드, 이력 저장, 게시, Telegram 링크 전송 단계 모두 성공. 공개 전체·바이오·미국대표·KOSPI·KOSDAQ 페이지 HTTP 200, 다섯 탭, 보정 합계 100.00%, 자료 기간 안내 확인. TIME ETF 그래프는 전체 보유 이력으로 2026-09-13부터 연결. 바이오 전체 보유종목은 TIME·TIGER·KODEX 저장, KoAct는 HTTP 429로 오늘 미수집(공백 처리). 사용자 단말 수신 확인은 별도.

2026-11-14 폰 화면 개선: 커밋 56e3fba, 실행 https://github.com/kns7676-commits/time-etf-dashboard/actions/runs/43557064765 성공(테스트 104개, 네 비교 수집, 게시, Telegram 링크 전송 단계 성공). 폭 760px 이하에서는 비교표 대신 ETF별 좌우 넘김 카드(TOP10 종목·코드·보정/원본 비중·합계, 표와 같은 색) 표시. PC 표의 왼쪽 행 제목 고정 해제로 좌우 이동 시 종목명 가림 해소. 공개 바이오·미국대표·KOSPI·KOSDAQ 페이지 HTTP 200, 카드 수 4/5/4/2 및 합계 100.00% 확인. 사용자 단말 수신 확인은 별도.

2026-11-14 비교 그래프 개선: 커밋 2425ac9, 실행 https://github.com/kns7676-commits/time-etf-dashboard/actions/runs/43558015517 성공(테스트 105개, 네 비교 수집, 게시, Telegram 링크 전송 단계 성공). 종목별 비교 그래프 Y축을 관측값 범위로 확대하고 높이 고정. 비교 탭 하단에 AI 탭과 같은 ETF별 전체 종목 그래프 추가(바이오 3·미국대표 2·KOSPI 2·KOSDAQ 1개, KoAct는 전체 보유 이력 생기면 추가). 공개 네 페이지 HTTP 200 확인.

2026-11-14 주가선 확대: 커밋 a5acc44, 실행 https://github.com/kns7676-commits/time-etf-dashboard/actions/runs/43558752457 성공(테스트 106개, 게시, Telegram 링크 전송 단계 성공). AI 탭 5개와 미국대표·KOSPI·KOSDAQ ETF별 그래프에 선택 종목 주가(검은 점선)와 비중 조정 세로선 표시. 같은 종목 주가는 한 번만 수집. 보유 자료일이 2일 미만인 바이오 ETF는 이력이 쌓이면 자동 추가. 공개 페이지 주가 패널 수 AI 5·미국대표 2·KOSPI 2·KOSDAQ 1 확인.

2026-11-14 비교 그래프 통합: 커밋 2a11643, 실행 https://github.com/kns7676-commits/time-etf-dashboard/actions/runs/43559755854 성공(테스트 105개, 네 비교 수집, 게시, Telegram 링크 전송 단계 성공). 비교 탭의 흐린 선 ETF별 그래프 제거, 선택 종목 그래프 하나에 ETF별 비중·주가(오른쪽 축)·비중 조정 세로선·▲▼·자동 흐름 표시. AI 탭 그래프는 유지하고 주가 설명만 접힘. 공개 페이지 HTTP 200, 주가 연결 종목 수 바이오 16·미국대표 91·KOSPI 92·KOSDAQ 82, AI 탭 접힌 주가 설명 5개 확인.

2026-11-14 KoAct 전체 보유 이력 및 수익률 추이: 실행 43560926180·43561180023에서 KoAct 국내 4종 62일 채움, 43562545289에서 미국대표 수익률 추이(FunETF 누적 NAV 수익률) 게시 및 해외 3종 거부 원인(CASH00000001 설정현금액 무비중 항목) 확인, 커밋 35a016a·실행 https://github.com/kns7676-commits/time-etf-dashboard/actions/runs/43563454552 에서 해외 3종 186건 추가. KoAct 7종 모두 62일(2026-09-13~) 실제 비중 보유. 모든 실행에서 게시와 Telegram 링크 전송 단계 성공. 첫 화면·AI 탭은 TIME AI 5종만 표시.

2026-11-14 바이오 이력·전 탭 수익률: 커밋 3088b07, 실행 https://github.com/kns7676-commits/time-etf-dashboard/actions/runs/43567216482 성공(게시, Telegram 링크 전송 단계 성공). FunETF 날짜별 구성종목으로 TIME K바이오·TIGER·KODEX 바이오 183건(자료일 2026-09-11~) 채움. 네 비교 탭 모두 수익률 추이 표시, 모든 비교 ETF 비중 이력 62일. 공개 페이지 HTTP 200 확인.

2026-11-14 기간별 TOP10 비교: 커밋 2910cad, 실행 https://github.com/kns7676-commits/time-etf-dashboard/actions/runs/43582428902 성공(refresh=false; 테스트, 네 비교 확인, 빌드, 이력 저장, 게시, Telegram 링크 전송 단계 성공). 네 비교 탭에 1/3/6개월 전·상장일 TOP10 비교 섹션 추가(FunETF 날짜별 구성종목, state/period-holdings.json 캐시). 공개 bio/us/kospi/kosdaq HTTP 200, 패널 16/20/16/8개, 기간 자료 경고 없음. 휴대폰 수신은 사용자 확인 필요.

2026-11-14 수익률 기간 선택: 커밋 ecaabe4, 실행 https://github.com/kns7676-commits/time-etf-dashboard/actions/runs/43583252669 성공(refresh=false; 테스트, 네 비교 확인, 빌드, 게시, Telegram 링크 전송 단계 성공). 네 비교 탭 수익률 추이에 1/3/5/10년 버튼과 시작일·종료일 조회 추가(ETF별 10년 주별+1년 일별 FunETF 자료 연결). 공개 bio/us/kospi/kosdaq HTTP 200, 장기 자료 사용 확인, 수익률 경고 없음. 휴대폰 수신은 사용자 확인 필요.

2026-11-14 기간별 TOP10 통합 표: 커밋 26ea0e4, 실행 https://github.com/kns7676-commits/time-etf-dashboard/actions/runs/43583765039 성공(refresh=false; 테스트, 빌드, 게시, Telegram 링크 전송 단계 성공). ETF 선택 버튼을 없애고 기간별로 모든 ETF를 한 표(ETF별 비중·비중 변동폭·과거 비중, 해당 TOP10에 없으면 공란)로 통합. 공개 bio/us/kospi/kosdaq HTTP 200, 기간 패널 4개씩, 경고 없음. 휴대폰 수신은 사용자 확인 필요.
