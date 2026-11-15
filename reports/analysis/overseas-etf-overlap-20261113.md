# 해외 상장 ETF와 국내 해외주식형 ETF 구성종목 비교

- 확인일: 2026-11-15 (KST)
- 국내 ETF 기준일: 2026-11-13 (`state/cumulative.json` 공식 전체 구성종목)
- 해외 ETF 기준일: ARKK·ARKQ·BOTZ·AIQ 2026-11-13, QQQ·SMH 2026-11-12. 하루 차이가 있으므로 수치는 참고용이다.
- 범위: 사용자가 고른 세 테마(AI·반도체, 나스닥·미국성장, 로봇·피지컬AI). 미국 상장 ETF 전체를 조사한 결과가 아니며, 투자 추천이 아니다.

## 비교 방법

- 이전 [TIME–KoAct 매칭 분석](time-koact-matching-20261113.md)과 같은 방식이다. 전체 구성종목에서 직접 보유한 주식만 종목코드로 대조했다(TOP10 한정 아님).
- 현금, 통화, 선물(NQZ6 등), ETF, 비상장 지분(OpenAI·Kalshi 등), 국채 MMF는 제외했다.
- 양쪽 주식 합계를 각각 100%로 환산한 다음, 같은 종목마다 두 비중 중 작은 값을 더해 **주식 비중 중복도**를 구했다.
- 미국 거래소 표기 US/UW/UQ/UN/UA는 하나로 통합했다. 일본(JP), 한국(KS/6자리), 중국(C1/C2), 홍콩(HK), 대만(TT) 등은 시장과 코드로 구분했다. ADR과 현지 주식은 다른 종목으로 취급했다(예: SMH의 TSM ADR ≠ 대만 2330).

## 1. 운용사별 자동 수집 가능성

| 운용사 | ETF | 자료 형식 | 자동 수집 | 과거 날짜 |
|---|---|---|---|---|
| ARK Invest | ARKK, ARKQ | CSV (`assets.ark-funds.com/fund-documents/funds-etf-csv/…_HOLDINGS.csv`) | ✅ 가능 | ❌ 당일 파일만 |
| Global X | BOTZ, AIQ | CSV (`assets.globalxetfs.com/funds/holdings/{ticker}_full-holdings_YYYYMMDD.csv`) | ✅ 가능 | ✅ 날짜 지정 가능(1년 전 확인) |
| Invesco | QQQ | JSON API (`dng-api.invesco.com/…/shareclasses/QQQ/holdings/fund`) | ✅ 가능 | ❌ 현재분만 |
| Invesco | SOXQ | 같은 API | ⚠️ HTTP 500 (1회 시도) | – |
| VanEck | SMH | xlsx (`vaneck.com/us/en/etf/equity/smh/holdings/download/xlsx/`, 쿠키 필요) | ✅ 가능 | ❌ 현재분만 |
| iShares (BlackRock) | SOXX 등 | CSV (`ishares.com/us/products/{id}/{slug}/latest-holdings.csv`) | ✅ 가능 (2026-11-15 재확인) | ❌ 최신분만 |
| State Street (SPDR) | XLK 등 | xlsx (`ssga.com/us/en/intermediary/library-content/products/fund-data/etfs/us/holdings-daily-us-en-{ticker}.xlsx`) | ✅ 가능 | ❌ 최신분만 |
| Vanguard | VGT, VUG 등 | JSON (`investor.vanguard.com/irr/funds/profile/{TICKER}-AdditionalFundData`, `holdingDetails.equityHoldings`) | ⚠️ 월말 기준만 | 2026-11-15 확인 시 기준일 2026-09-30 |

- iShares: 예전 `.ajax?fileType=csv` 경로는 로그인 페이지로 연결되지만, 상품 페이지의 `latest-holdings.csv`는 로그인 없이 CSV(수량 포함)를 준다. SOXX 기준일은 2026-11-12였다. Codex CLI와 검토해서 찾은 경로를 직접 확인했다. 로그인 우회나 User-Agent 위장은 하지 않았다.
- Vanguard: 사이트 내부용 JSON이라 안정성이 보장되지 않는다. 일일 구성종목이 아니라 월말 스냅샷(약 1~2개월 지연)이므로 일일 매매 추적에는 쓸 수 없다. 일일 PCF는 설정·환매 바스켓이라 실제 보유종목 대용으로 쓰지 않는다.
- SPDR 파일에는 "SSGA의 서면 동의 없이 복제·배포 금지" 문구가 있다. 분석용 수집과 공개 대시보드에 원자료를 다시 게시하는 것은 구분해서 약관을 확인해야 한다(다른 운용사도 마찬가지).
- ARK·Invesco·VanEck는 과거분을 받을 수 없으므로, 대시보드에 넣으면 **수집을 시작한 날부터** 이력이 쌓인다(지어낸 과거 기록 금지 원칙 유지).

## 2. 해외 ETF 요약

| ETF | 이름 | 주식 수 | 상위 5 종목 (주식 100% 환산) |
|---|---|---:|---|
| QQQ | Invesco QQQ Trust (나스닥100) | 98 | AAPL 8.6, NVDA 6.6, MSFT 6.4, AMZN 4.8, AMD 4.4 |
| AIQ | Global X AI & Technology | 88 | MSFT 4.1, PLTR 4.1, TSLA 3.7, SPCX 3.5, AMZN 3.4 |
| SMH | VanEck Semiconductor | 25 | NVDA 17.1, TSM 10.0, AVGO 6.5, AMD 6.5, TXN 6.2 |
| ARKK | ARK Innovation | 38 | TSLA 12.7, SPCX 8.4, TEM 6.5, CRCL 4.5, CRSP 4.2 |
| ARKQ | ARK Autonomous Tech & Robotics | 36 | TSLA 13.0, SPCX 9.7, KTOS 5.0, RKLB 4.9, NVDA 4.9 |
| BOTZ | Global X Robotics & AI | 80 | ISRG 10.6, 화낙(6954 JP) 8.6, 키엔스(6861 JP) 8.5, ABB 7.8, NVDA 6.5 |

## 3. 중복도 표 (공통 주식 수 / 주식 비중 중복도 %)

| 국내 ETF | QQQ | AIQ | SMH | ARKK | ARKQ | BOTZ |
|---|---:|---:|---:|---:|---:|---:|
| TIME 미국나스닥100액티브 | **30 / 57.0** | 20 / 43.5 | 12 / 29.0 | 11 / 23.8 | 8 / 23.1 | 3 / 8.6 |
| TIME 글로벌AI인공지능액티브 | 19 / 30.1 | **21 / 35.7** | 7 / 19.5 | 7 / 13.0 | 6 / 16.1 | 4 / 5.5 |
| KoAct 미국나스닥성장기업액티브 | **25 / 33.2** | 17 / 27.1 | 11 / 13.7 | 12 / 22.1 | 8 / 17.8 | 2 / 3.5 |
| KoAct 미국로봇피지컬AI액티브 | **19 / 39.6** | 14 / 30.5 | 9 / 24.4 | 9 / 23.0 | 13 / 27.7 | 9 / 12.8 |
| KoAct 글로벌AI메모리반도체액티브 | 8 / 8.6 | 4 / 7.3 | **5 / 15.0** | 0 / 0.0 | 1 / 2.3 | 0 / 0.0 |

## 4. 테마별 해석

### 나스닥·미국성장
- **TIME 미국나스닥100액티브 ↔ QQQ (57.0%)**: 가장 가까운 짝이다. 공통 상위 종목은 AAPL, MSFT, AMZN, AMD, NVDA, META. 다만 TIME은 AMD(7.8%)와 Bloom Energy 등을 QQQ보다 많이 담은 액티브 운용이다. "지수 대비 무엇을 더 담고 덜 담았나"를 보는 기준(벤치마크) 비교로 알맞다.
- **KoAct 미국나스닥성장기업액티브 ↔ QQQ (33.2%)**: 나스닥 대형주를 공유하지만 AMZN 9.6%, PLTR 5.5% 등 집중도가 높아 QQQ와의 차이가 크다.

### AI·반도체
- **TIME 글로벌AI인공지능액티브 ↔ AIQ (35.7%)**: AI 테마끼리 가장 가깝다. 공통은 MSFT, AMZN, AMD, TSM, SAP, TSLA. QQQ(30.1%)와도 비슷한 수준이라, 대형 기술주 비중이 겹침의 대부분을 차지한다.
- **KoAct 글로벌AI메모리반도체액티브 ↔ SMH (15.0%)**: 반도체 ETF와도 겹침이 낮다. 이 ETF는 주식의 **60.4%가 비미국 종목**(삼성전자, SK하이닉스, 어드반테스트, 도쿄일렉트론, 키옥시아 등)이다. 미국 상장 ETF는 이 종목들을 거의 직접 보유하지 않는다. 공통은 MU, AMAT, LRCX, MPWR, TER 다섯 종목뿐이다. 해외 ETF와 비교하기보다 **메모리 특화 전략이 얼마나 다른지 보여주는 대조군**으로 쓰는 편이 맞다.
- SMH는 TIME 글로벌AI와도 19.5%에 그친다. TSM은 ADR(미국 상장)로 들고 있으니 대만 현지주와는 별개로 계산된다는 점에 유의해야 한다.

### 로봇·피지컬AI
- **KoAct 미국로봇피지컬AI액티브**는 수치상 QQQ(39.6%)와 가장 많이 겹친다. AMZN, AMD, TSLA, GOOGL 같은 대형 기술주 비중이 크기 때문이다. 같은 전략이라고 보기는 어렵다.
- 전략이 비슷한 짝은 **ARKQ (27.7%, 공통 13종목)**다. TSLA, NVDA, PLTR, SPCX 등 자율주행·우주·AI 응용주가 겹친다.
- **BOTZ (12.8%)**는 화낙·키엔스·ABB·야스카와 같은 일본·유럽 산업용 로봇주 비중이 높아, 미국 피지컬AI와는 구성이 크게 다르다. "전통 산업용 로봇 vs 미국 피지컬AI"를 대조하는 용도로 의미가 있다.

## 5. 대시보드 반영 제안

| 우선 | 국내 탭 | 추가 후보 해외 ETF | 이유 |
|---|---|---|---|
| 1 | 미국대표 | QQQ | TIME 나스닥100의 사실상 벤치마크(57%) |
| 2 | AI | AIQ, SMH | AI 테마 최고 중복(AIQ), 반도체 대조(SMH) |
| 3 | 미국대표(로봇) | ARKQ, BOTZ | 피지컬AI 전략 유사(ARKQ), 산업용 로봇 대조(BOTZ) |

- 수집은 매일 워크플로에 단계로 넣을 수 있다. 다만 해외 ETF 실패는 국내 발행을 막지 않고 경고만 남기는 방식을 제안한다(Netlify 단계와 같은 원칙).
- 해외 ETF의 TOP10 비교, 순위, 비중 변화 그래프는 기존 렌더러를 쓸 수 있다. 다만 FunETF 수익률, 기간별 TOP10은 한국 ETF 전용이라 해외 ETF용 수익률 출처가 따로 필요하다.
- 환율, 기준일 차이(미국 장 마감 vs 한국 공시일)를 화면에 명시해야 한다.

## 6. 한계

- 해외 ETF 6종만 조사했다. iShares(SOXX 등)는 자동 수집이 막혀 있고, SOXQ는 API 오류로 빠졌다.
- 기준일이 하루 다른 ETF가 있다(QQQ·SMH 11-12).
- 비상장 지분(ARKK의 OpenAI 3.46% 등)과 선물은 제외했으므로, 중복도는 상장 주식 부분의 유사도다.
- 원자료와 계산 결과: [overseas-etf-overlap-20261113.json](overseas-etf-overlap-20261113.json)
