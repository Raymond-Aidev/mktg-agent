GoldenCheck  ·  AI Marketing Agent Platform  |  PRD v1.0 → v2.0

> **v2.0 업데이트 (2026-04-13)**: 제품명 GoldenCheck로 확정. 아래 구현 현황은 실제 배포 상태를 반영합니다.

## 구현 현황 요약

| 항목 | PRD 설계 | 현재 상태 |
|------|---------|----------|
| 제품명 | EduRights AI | **GoldenCheck** (www.goldencheck.kr) |
| 인프라 | AWS ECS + RDS | **Railway** (Postgres + Redis) |
| 타겟 | 교육 콘텐츠 기업 · 아동 도서 출판사 | **교육상품 유통사** (범위 확장) |
| 5개 AI 에이전트 | Research/Marketing/Translation/CRM/Analytics | Marketing Agent 부분 구현 (캠페인 초안, 콘텐츠 캘린더), 나머지 미구현 |
| 14모듈 SignalCraft | 14개 모듈 전체 | **6개 구현** (#01 Macro View, #03 Sentiment, #06 Market Intelligence, #07 Strategy, #08 Summary, #13 Integrated) |
| 인증 | 미정의 | **JWT + bcrypt** (회원가입/로그인/역할 관리) |
| 제품/키워드 관리 | 미정의 | **CRUD 구현** (products + product_keywords 테이블) |
| 랜딩 페이지 | 미정의 | **구현 완료** (히어로, 기능소개, 요금제, FAQ, 로그인 모달) |
| 어드민 패널 | 미정의 | **구현 완료** (회원 관리, 시스템 모니터링, 계정 생성, 권한 부여) |
| 법적 문서 | 미정의 | **v1.0 완료** (이용약관, 개인정보처리방침, 사업자정보, 요금제) |
| #06 분석 프레임워크 | SWOT | **SOV/포지셔닝/콘텐츠갭/리스크시그널** (SWOT은 부적합하여 교체) |
| 리포트 시각화 | 텍스트 기반 | **시각화 완료** (도넛차트, SOV바, 포지셔닝맵, 타임라인, SWOT→갭분석) |
| 결제 | 미정의 | **요금제 페이지** (Starter 50만/Professional 150만/Enterprise 문의) — PG 연동 미구현 |

---

GoldenCheck (구 EduRights AI)
AI Marketing Agent Platform


Product Requirements Document


문서 버전
	v1.0 — 초안 (아래 원본은 이력 보존용)
	작성일
	2026년 4월
	분류
	대외비 (CONFIDENTIAL)
	제품명
	GoldenCheck (구 EduRights AI) — AI Marketing Agent Platform
	타겟 시장
	교육상품 유통사 · 교육 콘텐츠 기업 · 아동 도서 출판사
	MVP 일정
	2026년 10월 (볼로냐 북페어 시즌 대비)
	

제품 한 줄 요약
	5개 전문 AI 에이전트와 14모듈 여론 분석 파이프라인(AI SignalCraft)이 결합된,
교육 콘텐츠 기업 전용 자동화 마케팅 플랫폼
	________________


목  차








________________


1. 제품 개요


1.1 비전
교육 콘텐츠 기업과 아동 도서 출판사가 해외 시장에서 효과적으로 경쟁할 수 있도록, AI가 리서치·마케팅·번역·CRM·분析을 24시간 자동화하는 통합 에이전트 플랫폼을 제공한다. 수작업과 고비용 대행사 없이도 볼로냐 북페어 수준의 전문 마케팅을 실현한다.


1.2 핵심 가치 제안
* 시간 절약 — 주 40시간 소요되던 리서치·번역·CRM 작업을 1~3시간으로 압축
* 비용 절감 — 마케팅 에이전시 대비 80% 비용 절감
* 정확성 — 14개 AI 분석 모듈이 다각도로 시장·여론·경쟁 환경 분석
* 글로벌화 — 26개 언어 실시간 번역 및 현지화 지원
* 데이터 기반 — 모든 의사결정에 정량적 근거 자동 생성


1.3 제품 범위
EduRights AI는 다음 두 레이어로 구성된다.


레이어
	구성
	역할
	코어 에이전트
	5개 전문 AI 에이전트
	Research · Marketing · Translation · CRM · Analytics
	시그널 인텔리전스
	AI SignalCraft (14개 모듈)
	온라인 여론 자동 수집 → 4단계 AI 분석 → 전략 리포트
	________________


2. 배경 및 문제 정의


2.1 시장 현황
글로벌 아동·교육 출판 시장은 2024년 기준 약 620억 달러 규모로 연 5.2% 성장 중이다. 볼로냐 국제 아동 도서전에는 매년 100개국 이상, 1,500개 이상의 출판사가 참가하며, 저작권 거래와 글로벌 파트너십의 핵심 무대다.


* 국내 교육 콘텐츠 기업의 해외 진출 시 주요 장벽: 언어 장벽, 현지 시장 정보 부족, 고비용 에이전시 의존
* 한국 출판사 중 독립적 글로벌 마케팅 역량을 보유한 비율은 15% 미만
* AI 기반 마케팅 자동화 도구 도입률: 글로벌 평균 34% vs 한국 출판업계 8%


2.2 고객 문제
해결해야 할 핵심 문제 3가지
	① 정보 비대칭 — 해외 바이어·시장 트렌드 정보를 실시간으로 파악할 수단이 없다
② 운영 병목 — 번역·CRM·리포트 작성이 모두 수작업으로 이루어져 인력 낭비가 심하다
③ 전략 부재 — 데이터 기반 마케팅 전략을 수립할 역량이나 예산이 부족하다
	

2.3 경쟁 환경
구분
	기존 솔루션
	EduRights AI
	리서치
	구글 검색, 직접 조사 (2~3일 소요)
	AI 자동 수집·분석 (2~3시간)
	번역
	DeepL/Google Translate (수동 교정)
	교육 도메인 특화 AI 번역 + 현지화
	CRM
	Excel, 수동 관리
	AI 자동 리드 스코어링 + 팔로업 자동화
	여론 분석
	없음 또는 고비용 에이전시
	14모듈 AI 파이프라인, 1~3시간 자동 생성
	전략 도출
	컨설팅 의뢰 (수백만 원)
	AI가 즉시 전략 옵션 생성
	________________


3. 타겟 사용자


3.1 주요 페르소나


페르소나 A — 해외 사업 담당자
	직무: 중견 교육 출판사 해외 사업팀 팀장 (3~5년 경력)
목표: 볼로냐 북페어에서 저작권 계약 5건 이상 달성
Pain Point: 바이어 리서치에 매주 20시간 소요 / 영어 자료 제작 외주 비용 부담
핵심 니즈: 바이어 데이터 자동 수집, 영어 피칭 자료 자동 생성
	

페르소나 B — 콘텐츠 마케터
	직무: 에듀테크 스타트업 마케팅 담당 (1인 팀)
목표: 글로벌 SNS 팔로워 확대, 해외 미디어 노출 증가
Pain Point: 다국어 콘텐츠 제작 역량·시간 부족 / 시장 트렌드 파악 불가
핵심 니즈: 다국어 콘텐츠 자동 생성, 경쟁사 모니터링
	

페르소나 C — 대표/의사결정자
	직무: 아동 도서 출판사 대표 (50인 이하 SMB)
목표: 해외 매출 비중 30% 달성
Pain Point: 글로벌 전략 수립 전문 인력·예산 부족
핵심 니즈: 데이터 기반 전략 리포트, 1페이지 요약 대시보드
	

3.2 사용 시나리오
시나리오 1 — 볼로냐 북페어 사전 준비 (D-30)
   * Research Agent가 참가 출판사 1,500개의 프로필·저작권 거래 이력 자동 수집
   * AI SignalCraft가 타겟 시장 온라인 반응 분석 → 트렌드 리포트 자동 생성
   * Marketing Agent가 타겟 바이어별 맞춤 피칭 자료 자동 생성


시나리오 2 — 현장 CRM 활용 (행사 중)
   * CRM Agent가 명함·미팅 메모 자동 입력 및 후속 이메일 초안 생성
   * Translation Agent가 현장 계약서·카탈로그 실시간 다국어 번역


시나리오 3 — 사후 분석 (D+7)
   * Analytics Agent가 행사 성과 분석 및 차기 전략 권고사항 자동 리포트 생성
   * AI SignalCraft가 경쟁사 반응·시장 반향 온라인 여론 분석
________________


4. 제품 아키텍처


4.1 전체 시스템 구조
EduRights AI는 3-레이어 아키텍처로 구성된다.


레이어
	컴포넌트
	역할
	프레젠테이션
	React 대시보드 · REST API
	사용자 인터페이스 및 외부 연동
	에이전트 레이어
	5개 AI 에이전트 + SignalCraft 14모듈
	핵심 AI 로직 실행
	인프라 레이어
	BullMQ · Redis · PostgreSQL · S3
	작업 큐 · 캐싱 · 데이터 영속화
	

4.2 5개 핵심 AI 에이전트


에이전트
	핵심 기능
	우선순위
	MVP 포함
	Research Agent
	시장 조사, 바이어 프로파일링, 경쟁사 분석
	P0
	✓
	Marketing Agent
	캠페인 기획, 피칭 자료 생성, 콘텐츠 자동화
	P0
	✓
	Translation Agent
	26개 언어 번역, 현지화, 전문 용어 관리
	P1
	✓
	CRM Agent
	바이어 DB, 리드 스코어링, 팔로업 자동화
	P1
	✓
	Analytics Agent
	성과 분석, IP 확장 기회 탐지, 전략 리포트
	P2
	Phase 2
	

※ P0 = MVP 필수, P1 = MVP 권장, P2 = Phase 2 개발


4.3 AI SignalCraft — 시그널 인텔리전스
AI SignalCraft는 5개 한국 온라인 매체에서 여론을 자동 수집하고 14개 AI 분석 모듈로 다각도 분석해 전략 리포트를 1~3시간 안에 자동 생성하는 서브시스템이다.


데이터 소스
	수집 방법
	수집 데이터
	네이버 뉴스
	Playwright 크롤링
	기사 본문, 댓글, 반응수
	네이버 댓글
	API + Cheerio
	실시간 댓글, 좋아요/싫어요
	유튜브 영상·댓글
	YouTube Data API v3
	영상 메타데이터, 댓글 스레드
	DC인사이드
	Playwright 크롤링
	게시글, 댓글, 추천수
	클리앙 · FM코리아
	Cheerio 파서
	게시글, 답글, 조회수
	

4단계 분석 파이프라인
단계
	실행 방식
	포함 모듈 (번호)
	LLM 모델
	Stage 1 — 수집·분류
	4개 모듈 병렬 실행
	#01 거시 여론, #02 집단 반응, #03 감정/프레임, #04 메시지 파급력
	Gemini 2.5 Flash
	Stage 2 — 전략 분析
	3개 모듈 순차 실행
	#05 리스크 지도, #06 기회 분석, #07 전략 도출
	Claude Sonnet 4.6
	Stage 3 — 요약·통합
	2개 모듈 실행
	#08 최종 요약, #13 통합 리포트 생성
	Claude Sonnet 4.6
	Stage 4 — 고급 분析
	4개 모듈 실행
	#09 브랜드 선호도, #10 프레임 경쟁, #11 위기 시나리오, #12 전략 성공 확률
	Claude Sonnet 4.6
	

시스템 모듈
	#14 파이프라인 오케스트레이션 — BullMQ + Redis 기반 의존성 그래프 실행, 장애 격리 및 자동 재시도
#15 지식 그래프 (온톨로지) — 6개 모듈 JSON에서 엔티티·관계 자동 추출 → PostgreSQL 영속화, D3.js 시각화
	________________


5. 기능 요구사항


5.1 Research Agent
ID
	요구사항
	우선순위
	완료 기준
	RA-01
	키워드 기반 볼로냐 참가 출판사 자동 수집 (500개 이상/회)
	P0
	수집 성공률 ≥ 95%
	RA-02
	출판사별 저작권 거래 이력 · 선호 장르 프로파일 자동 생성
	P0
	필드 완성도 ≥ 80%
	RA-03
	경쟁사 신작 · 계약 동향 실시간 모니터링 (주 1회 이상)
	P1
	위클리 알림 발송
	RA-04
	시장 트렌드 리포트 자동 생성 (PDF + 대시보드)
	P1
	리포트 생성 ≤ 10분
	

5.2 Marketing Agent
ID
	요구사항
	우선순위
	완료 기준
	MA-01
	바이어 프로파일 기반 맞춤형 피칭 덱 자동 생성 (PPTX)
	P0
	사용자 만족도 ≥ 4.0/5.0
	MA-02
	채널별 SNS 콘텐츠 캘린더 자동 생성 (Instagram · LinkedIn · X)
	P0
	월 30건 이상 생성 가능
	MA-03
	이메일 캠페인 시퀀스 자동 설계 및 초안 생성 (A/B 버전)
	P1
	오픈율 업계 평균 +10%p 목표
	MA-04
	브랜드 보이스 가이드 기반 콘텐츠 일관성 검증
	P2
	가이드 준수율 ≥ 90%
	

5.3 Translation Agent
ID
	요구사항
	우선순위
	완료 기준
	TA-01
	26개 언어 실시간 번역 (영어 ↔ 한국어 포함)
	P0
	BLEU score ≥ 0.7
	TA-02
	교육·출판 도메인 전문 용어집 관리 (사용자 정의 가능)
	P1
	용어 일관성 오류 ≤ 5%
	TA-03
	번역본 현지화 품질 검토 리포트 자동 생성
	P1
	검토 시간 ≤ 5분/페이지
	

5.4 CRM Agent
ID
	요구사항
	우선순위
	완료 기준
	CA-01
	바이어 DB 자동 구축 및 관계 점수(Lead Score) 산출
	P0
	스코어 정확도 검증 완료
	CA-02
	미팅 후 팔로업 이메일 자동 초안 생성 (24시간 이내)
	P0
	초안 채택률 ≥ 70%
	CA-03
	파이프라인 단계별 진행 상황 시각화 대시보드
	P1
	실시간 업데이트 지연 ≤ 5초
	CA-04
	계약 체결 확률 AI 예측 (베이지안 모델)
	P2
	예측 정확도 ≥ 75%
	

5.5 Analytics Agent (Phase 2)
ID
	요구사항
	우선순위
	완료 기준
	AA-01
	IP 확장 기회 지도 자동 생성 (장르×지역×시즌 매트릭스)
	P2
	기회 발굴 정확도 검증
	AA-02
	저작권 계약 ROI 분석 자동화
	P2
	재무 지표 정확도 ≥ 98%
	AA-03
	경쟁사 대비 포지셔닝 갭 분석
	P2
	분기별 자동 업데이트
	

5.6 AI SignalCraft — 14개 분析 모듈 요구사항


모듈 ID
	모듈명
	핵심 출력
	LLM
	단계
	SC-01
	#01 전체 여론 구조 (Macro View)
	overallDirection, inflectionPoints, dailyMentionTrend
	Gemini 2.5 Flash
	Stage 1
	SC-02
	#02 집단별 반응 분析 (Segmentation)
	audienceGroups, platformSegments, highInfluenceGroup
	Gemini 2.5 Flash
	Stage 1
	SC-03
	#03 감정·프레임 분析 (Sentiment & Framing)
	sentimentRatio, topKeywords, frameConflict
	Gemini 2.5 Flash
	Stage 1
	SC-04
	#04 메시지 효과 분析 (Message Impact)
	successMessages, failureMessages, highSpreadContentTypes
	Gemini 2.5 Flash
	Stage 1
	SC-05
	#05 리스크 지도 (Risk Map)
	topRisks, overallRiskLevel, riskTrend
	Claude Sonnet 4.6
	Stage 2
	SC-06
	#06 기회 分析 (Opportunity)
	positiveAssets, untappedAreas, priorityOpportunity
	Claude Sonnet 4.6
	Stage 2
	SC-07
	#07 종합 전략 도출 (Strategy)
	targetStrategy, messageStrategy, contentStrategy
	Claude Sonnet 4.6
	Stage 2
	SC-08
	#08 최종 전략 요약 (Final Summary)
	oneLiner, criticalActions, outlook
	Claude Sonnet 4.6
	Stage 3
	SC-09
	#09 브랜드 선호도 추정 (Brand Preference)
	estimatedRange, confidence, methodology
	Claude Sonnet 4.6
	Stage 4
	SC-10
	#10 메시지 프레임 경쟁 (Frame Competition)
	dominantFrames, threateningFrames, battlefieldSummary
	Claude Sonnet 4.6
	Stage 4
	SC-11
	#11 위기 대응 시나리오 (Crisis Scenario)
	scenarios, currentRiskLevel, recommendedAction
	Claude Sonnet 4.6
	Stage 4
	SC-12
	#12 전략 성공 확률 시뮬레이션 (Success Simulation)
	successProbability, successConditions, keyStrategies
	Claude Sonnet 4.6
	Stage 4
	SC-13
	#13 통합 리포트 생성 (Integrated Report)
	markdown, sections, metadata
	Claude Sonnet 4.6
	Stage 3
	SC-14
	#14 파이프라인 오케스트레이션
	jobStatus, progress, partialResults
	BullMQ + Redis (LLM 비사용)
	시스템
	

SignalCraft 공통 요구사항
	모든 모듈 출력은 Zod 스키마로 타입 강제 — JSON 구조 일관성 보장
한 모듈 실패 시 전체 파이프라인 중단 없이 부분 결과로 계속 진행
Redis에 중간 결과 영속화 — 재실행 시 이전 완료 모듈 스킵 (비용 절감)
모든 추정값에는 신뢰도(confidence) 및 면책 문구(disclaimer) 자동 포함
	________________


6. 대시보드 설계 요구사항


EduRights AI는 사용자 유형에 따라 두 개의 독립적인 대시보드를 제공한다. 고객 대시보드는 교육상품 유통사 의사결정권자 중심으로 설계되고, 운영자 대시보드는 개발사 내부 팀이 전체 데이터 수집·분석 상태를 모니터링하기 위해 사용한다.


6.1 고객 대시보드 (Customer Dashboard)
대상: 교육상품 유통회사의 대표·팀장급 의사결정권자. 복잡한 기술 지표 없이 비즈니스 성과 중심의 정보를 제공하며, 에이전트 실행 결과를 즉시 행동으로 연결할 수 있는 인터페이스를 지향한다.


6.1.1 비즈니스 KPI 패널 (상단 고정)
KPI 항목
	데이터 소스
	업데이트 주기
	표시 형식
	활성 바이어 수
	CRM Agent DB
	실시간
	숫자 + 전주 대비 증감
	진행 중 계약 건수
	CRM Pipeline
	실시간
	단계별 파이프라인 퍼널
	예상 매출 (계약 성사 시)
	CRM × 리드 스코어
	일별
	금액 + 달성률 게이지
	이번 주 팔로업 필요
	CRM Agent 알림
	실시간
	긴급도별 색상 배지
	AI 에이전트 활성 상태
	작업 큐 헬스
	30초
	5개 에이전트 상태 아이콘
	

6.1.2 시장 인텔리전스 섹션 (AI SignalCraft 요약)
위젯
	표시 내용
	행동 버튼
	여론 동향 카드
	최신 분석 한 줄 요약 (oneLiner) + 전체 방향성 (overallDirection)
	리포트 전체 보기
	리스크 레벨 게이지
	현재 리스크 수준 (overallRiskLevel) + Top 3 리스크 요약
	위기 시나리오 보기
	기회 포인트 카드
	우선순위 기회 3개 (priorityOpportunity)
	전략 도출 보기
	브랜드 선호도 추정
	선호도 범위 (estimatedRange) + 신뢰도 배지
	상세 분석 보기
	전략 성공 확률
	successProbability % + 핵심 조건 충족 현황
	전략 상세 보기
	

6.1.3 바이어 리드 현황
* 지역별 바이어 분포 차트 (유럽·아시아·북미·기타) — 도넛 차트
* 장르×국가 매칭 히트맵 — 자사 콘텐츠와 바이어 선호 장르 교차 분석
* Hot Leads 테이블 — 리드 스코어 상위 10개 바이어 (점수·국가·마지막 접촉일·다음 액션)
* 팔로업 캘린더 뷰 — 이번 주·다음 주 예정된 팔로업 일정


6.1.4 캠페인 성과 패널
* 이메일 캠페인: 발송 수 / 오픈율 / 클릭률 / 회신율 — 주별 트렌드 라인 차트
* 피칭 덱 현황: 생성 건수 / 바이어별 조회 여부 / 버전 관리
* SNS 콘텐츠: 채널별(Instagram·LinkedIn·X) 예약/발행/성과 현황


6.1.5 번역·현지화 현황
* 언어별 처리 건수 및 처리 완료율 — 수평 바 차트
* 전문 용어집 업데이트 현황 (마지막 수정일·총 용어 수)
* 최근 번역 요청 목록 (파일명·언어·상태·완료 예정)


6.1.6 알림 및 액션 센터
* 중요도별 알림 피드 (긴급/일반/정보) — 에이전트 작업 완료, 팔로업 기한, 시장 이슈
* 원클릭 액션 — '피칭 덱 생성', 'SignalCraft 분석 시작', '이메일 초안 보기'
* 최근 AI 에이전트 실행 히스토리 (작업명·시작~완료 시간·결과 링크)


고객 대시보드 UX 원칙
	비기술 사용자 기준 — 기술 용어 최소화, 한국어 우선 표기
3-클릭 원칙 — 어떤 정보도 메인 화면에서 3번 이내로 도달 가능
모바일 반응형 — 태블릿·스마트폰에서도 핵심 KPI 확인 가능
다크/라이트 모드 전환 — 사용자 환경 설정에 따라 자동 전환
	________________


6.2 운영자 대시보드 (Admin / Ops Dashboard)
대상: 개발사 내부 담당자(PM·엔지니어·DevOps). 전체 SaaS 플랫폼의 데이터 수집·파이프라인 실행·시스템 건강 상태를 실시간으로 모니터링하고 문제를 즉시 감지·대응하기 위한 내부 전용 화면이다.


6.2.1 시스템 헬스 요약 (최상단 상태 바)
지표
	정상 기준
	경고 기준
	알림 채널
	전체 가동률 (Uptime)
	≥ 99.5%
	< 99%
	Slack #ops-alert
	API 응답시간 P95
	≤ 500ms
	> 800ms
	Slack + PagerDuty
	BullMQ 실패 작업 수
	0건/시간
	≥ 3건/시간
	Slack #ops-alert
	LLM API 에러율
	< 1%
	≥ 3%
	Slack + 이메일
	Redis 메모리 사용률
	< 70%
	≥ 85%
	Slack #infra
	PostgreSQL 응답시간
	< 100ms (P95)
	> 300ms
	Slack #infra
	

6.2.2 데이터 수집 현황 (크롤러 모니터)
5개 매체별 크롤링 상태를 실시간으로 추적한다.
모니터링 항목
	표시 방법
	조치 버튼
	매체별 마지막 수집 시간
	실시간 타임스탬프 + 경과 시간 배지
	즉시 수동 실행
	수집 성공 건수 (최근 24h)
	매체별 숫자 카드 + 시간별 라인 차트
	로그 상세 보기
	수집 실패·에러 건수
	빨간 배지 + 오류 유형 분류 (429/503/파싱오류)
	에러 로그 보기
	크롤러 속도 (건/분)
	매체별 수평 게이지 바
	-
	robots.txt 위반 감지
	즉시 빨간 경고 + 자동 중단
	정책 확인
	Playwright 인스턴스 상태
	실행 중/대기/중단 인스턴스 수
	인스턴스 재시작
	

6.2.3 AI SignalCraft 파이프라인 실행 현황
BullMQ 작업 큐의 상태를 테넌트별·모듈별로 가시화한다.
섹션
	표시 내용
	작업 큐 전체 현황
	대기(Waiting) / 실행 중(Active) / 완료(Completed) / 실패(Failed) 건수 — 실시간 도넛 차트
	현재 실행 중 파이프라인
	테넌트명 · 키워드 · 현재 모듈 · 진행률(%) · 경과 시간 — 진행 바
	모듈별 실행 통계 (14개)
	모듈별 평균 소요시간 · 성공률 · 최근 7일 실패 건수 — 히트맵 테이블
	실패 작업 상세
	오류 메시지 · 재시도 횟수 · 마지막 실패 시각 · 원인 분류 — 펼침 목록
	일별 파이프라인 실행 추이
	테넌트별 일 실행 횟수 — 스택 바 차트 (30일)
	

6.2.4 LLM API 사용량 및 비용 모니터
항목
	세부 지표
	시각화
	모델별 호출 수
	Gemini 2.5 Flash vs Claude Sonnet 4.6 — 일별·월별
	누적 라인 차트
	토큰 사용량
	입력/출력 토큰 분리, 모듈별 평균
	스택 바 차트
	API 비용 (USD)
	모델별 · 테넌트별 · 월별 누적
	비용 게이지 (한도 대비)
	비용 이상 감지
	일별 비용이 이동평균 2배 초과 시 자동 알림
	경고 배지
	캐시 절감률
	Redis 캐시 히트로 절감한 LLM 호출 수 · 비용
	절감액 카드
	Rate Limit 이벤트
	429 에러 발생 횟수 · 모델별 · 시간별
	이벤트 로그
	

6.2.5 테넌트(고객사)별 사용량 대시보드
* 고객사 목록 테이블: 회사명·플랜·월 SignalCraft 실행 수·LLM 비용·마지막 접속일·상태
* 사용량 상위 N개사 랭킹 — 과금 기준으로 정렬
* 이상 사용 감지 — 특정 테넌트가 갑자기 사용량 급증 시 하이라이트
* 플랜별 한도 초과 현황 — 초과 직전(80%)/초과(100%) 테넌트 색상 구분


6.2.6 실시간 에러 로그 스트림
* 최근 500건 에러 실시간 스트림 (WebSocket 기반)
* 필터: 에러 레벨 (CRITICAL·ERROR·WARN) / 서비스 (크롤러·파이프라인·API·LLM) / 테넌트
* 에러 클러스터링 — 동일 패턴 에러를 자동 그룹화하여 중복 노이즈 최소화
* 에러 → Jira 티켓 자동 생성 버튼 (P0 에러 발생 시)


6.2.7 인프라 지표 패널
인프라 항목
	핵심 지표
	시각화
	Redis (BullMQ 큐)
	메모리 사용률 · 연결 수 · 초당 명령 처리량
	게이지 + 라인
	PostgreSQL
	활성 연결 수 · P95 쿼리 시간 · DB 크기 · 슬로우 쿼리 Top 5
	테이블 + 라인
	AWS ECS (컨테이너)
	실행 중 태스크 수 · CPU · 메모리 사용률
	시계열 차트
	S3 (파일 스토리지)
	저장 용량 · 일별 업로드 건수 · 비용
	누적 바 차트
	Playwright 인스턴스 풀
	총 인스턴스 · 가용 · 사용 중 · 대기 큐 깊이
	리얼타임 바
	

운영자 대시보드 접근 권한 정책
	접근 대상: 개발사 내부 팀만 (고객사에는 공개 불가)
인증: SSO (Google Workspace) + IP 화이트리스트 제한
역할 분리: Admin (전체 조회·조작) / Viewer (조회 전용) / Billing (비용 지표만)
감사 로그: 운영자 모든 행동(재시작·수동 실행·설정 변경)은 감사 로그에 기록
	________________


6.3 두 대시보드 비교 요약
항목
	고객 대시보드
	운영자 대시보드
	대상 사용자
	교육상품 유통사 의사결정권자
	개발사 내부 담당자 (PM·엔지니어)
	주요 관심사
	비즈니스 성과·계약·캠페인
	시스템 상태·비용·에러·파이프라인
	데이터 갱신 주기
	KPI: 일별, 에이전트 상태: 실시간
	전체 실시간 (WebSocket)
	접근 방법
	SaaS 로그인 (테넌트별 격리)
	내부 VPN + SSO + IP 화이트리스트
	알림 채널
	인앱 알림 · 이메일
	Slack #ops-alert · PagerDuty
	기술 지표 노출
	최소화 (비기술 사용자 배려)
	전체 노출 (기술 담당자 대상)
	SignalCraft 표시
	분석 결과 요약 (한 줄·카드)
	14개 모듈 실행 현황 전체
	MVP 포함 여부
	✓ Phase 1 필수
	✓ Phase 1 필수 (내부 운영 불가능)
	________________


7. 비기능 요구사항


6.1 성능
항목
	요구사항
	측정 방법
	SignalCraft 전체 파이프라인
	1~3시간 이내 완료 (14개 모듈 순서 실행 기준)
	E2E 테스트 평균
	대시보드 초기 로딩
	≤ 2초 (LCP 기준)
	Lighthouse 점수
	API 응답 시간
	P95 ≤ 500ms
	APM 모니터링
	동시 사용자
	최대 100명 동시 접속 지원
	부하 테스트
	데이터 수집 속도
	매체당 ≤ 10분 (5개 매체 병렬 실행 시 ≤ 15분 전체)
	크롤러 성능 테스트
	

6.2 보안 및 컴플라이언스
* 개인정보보호법 준수 — 수집·처리·파기 전 과정 법적 요건 충족
* robots.txt 및 각 사이트 이용약관 준수 범위 내에서만 크롤링
* 공개 데이터만 수집 — 비공개 게시물·DM·암호화 채널 수집 금지
* LLM 프롬프트에 '실제 존재하는 데이터만 인용, 생성 금지' 지침 필수 포함
* API 키 및 자격증명 — AWS Secrets Manager 또는 Vault 관리
* HTTPS 전송 암호화, 저장 데이터 AES-256 암호화


6.3 확장성
* BullMQ 작업 큐 기반 — 수평 확장(Worker 추가)으로 처리량 선형 증가
* 멀티테넌시 — 조직(테넌트)별 데이터 격리 및 요금 부과
* 모듈 추가 용이성 — 14개 모듈 이외 새 분析 모듈을 플러그인 방식으로 추가 가능
* 다국어 확장 — i18n 기반 UI, 현재 한국어 · 영어 → 추후 일본어 · 중국어 추가


6.4 가용성
* 목표 가동률(Uptime) 99.5% (월간 다운타임 ≤ 3.6시간)
* LLM API 장애 시 자동 폴백 — 주 모델 실패 → 백업 모델 자동 전환
* Redis 기반 중간 결과 영속화 — 서버 재시작 시에도 파이프라인 재개 가능
________________


8. 기술 스택


영역
	기술 선택
	선정 이유
	프론트엔드
	React 18 + TypeScript + Chart.js 4
	컴포넌트 재사용성, 풍부한 시각화
	백엔드
	Node.js (Express) + TypeScript
	LLM SDK 호환성, 비동기 처리 효율
	AI 프레임워크
	LangChain · LangGraph
	에이전트 오케스트레이션 추상화
	LLM — Stage 1
	Google Gemini 2.5 Flash
	대량 텍스트 빠르고 저비용 분류·요약
	LLM — Stage 2-4
	Anthropic Claude Sonnet 4.6
	복합 추론·전략 도출 품질 우선
	작업 큐
	BullMQ + Redis 7
	의존성 그래프 실행, 재시도, 영속화
	벡터 DB
	Qdrant
	바이어 프로파일 의미 검색, RAG 기반 추천
	관계형 DB
	PostgreSQL 16
	트랜잭션, 지식 그래프 영속화
	크롤링
	Playwright + Cheerio
	SPA·동적 페이지 수집, 경량 파서
	스키마 검증
	Zod
	LLM 출력 타입 강제, 런타임 안전성
	파일 스토리지
	AWS S3 / MinIO
	리포트 · 미디어 파일 저장
	인프라
	Docker + AWS ECS (Fargate)
	컨테이너 기반 수평 확장
	________________


9. MVP 범위 및 로드맵


8.1 MVP 포함 범위 (Phase 1 — 6개월)
MVP 포함
	✓ Research Agent — 바이어 자동 수집, 프로파일 생성
✓ Marketing Agent — 피칭 덱, SNS 캘린더, 이메일 초안
✓ Translation Agent — 영어·한국어 핵심 6개 언어
✓ CRM Agent — 바이어 DB, 리드 스코어, 팔로업 자동화
✓ AI SignalCraft — 14개 모듈 전체 (Stage 1~4 파이프라인)
✓ 대시보드 — KPI 5종, 에이전트 상태, SignalCraft 시각화
✓ 사용자 인증 및 멀티테넌시 기초
	

MVP 제외 (Phase 2 이후)
	✗ Analytics Agent (IP 확장 기회, ROI 분析)
✗ 26개 언어 완전 지원 (MVP: 6개 언어)
✗ 계약 체결 확률 AI 예측
✗ 실시간 위기 알림 (24/7 스케줄러)
✗ D3.js 지식 그래프 인터랙티브 시각화
	

8.2 개발 일정


월차
	스프린트
	핵심 딜리버러블
	마일스톤
	M1
	Sprint 1-2
	인프라 셋업, BullMQ/Redis, 크롤러 기초 (3개 소스)
	크롤러 PoC 완료
	M2
	Sprint 3-4
	SignalCraft Stage 1 (4개 모듈), Zod 스키마 정의
	Stage 1 파이프라인 동작
	M3
	Sprint 5-6
	SignalCraft Stage 2-4 (10개 모듈), Research Agent MVP
	14모듈 E2E 통과
	M4
	Sprint 7-8
	Marketing Agent, Translation Agent (6개 언어)
	내부 베타 오픈
	M5
	Sprint 9-10
	CRM Agent, 대시보드 완성, 통합 테스트
	외부 파일럿 (3개사)
	M6
	Sprint 11-12
	피드백 반영, 성능 최적화, 보안 감사, 런칭 준비
	정식 출시 (볼로냐 D-30)
	________________


10. 팀 구성 및 비용 추정


9.1 MVP 팀 구성 (최소 4인)
역할
	주요 책임
	인원
	풀스택 개발 리드
	백엔드 아키텍처, LangChain 에이전트, BullMQ 파이프라인
	1명
	프론트엔드 개발자
	React 대시보드, Chart.js 시각화, UX/UI 구현
	1명
	AI/ML 엔지니어
	LLM 프롬프트 엔지니어링, Zod 스키마, 크롤러
	1명
	PM / 도메인 전문가
	출판 도메인 기획, 바이어 DB 설계, QA
	1명
	

9.2 MVP 개발 비용 추정
항목
	월 비용 (추정)
	6개월 합계
	인건비 (4인)
	~3,000만 원
	~1억 8,000만 원
	LLM API (Gemini + Claude)
	~150만 원
	~900만 원
	인프라 (AWS ECS, Redis, PostgreSQL, S3)
	~80만 원
	~480만 원
	기타 (SaaS, 도구, 보안 감사 등)
	~50만 원
	~300만 원
	합계
	~3,280만 원
	~2억 1,000만 원
	

비용 최적화 전략
	Stage 1 모듈 — Gemini 2.5 Flash 사용으로 Claude 단일 대비 API 비용 약 40% 절감
Redis 캐싱 — 동일 키워드 재실행 시 완료 모듈 스킵, LLM 호출 최대 60% 감소
Batch Processing — 비실시간 분析은 야간 배치 실행으로 LLM 비용 할인 적용
	________________


11. 성공 지표 (KPI)


지표 분류
	KPI
	목표치 (출시 6개월 후)
	측정 방법
	비즈니스
	유료 가입 기업 수
	50개사 이상
	CRM 데이터
	비즈니스
	월 반복 수익 (MRR)
	5,000만 원 이상
	결제 데이터
	사용자 활성도
	주간 활성 사용자 (WAU)
	가입사당 ≥ 3명
	로그 분析
	사용자 활성도
	SignalCraft 월 실행 횟수
	기업당 ≥ 4회/월
	파이프라인 로그
	제품 품질
	리포트 생성 성공률
	≥ 98%
	에러 로그
	제품 품질
	14개 모듈 평균 완료 시간
	≤ 90분
	작업 큐 메트릭
	고객 만족도
	NPS (순추천지수)
	≥ 40
	분기별 설문
	고객 만족도
	에이전트 출력 채택률
	≥ 70%
	사용자 행동 로그
	________________


12. 리스크 및 대응


리스크
	발생 확률
	영향도
	대응 전략
	LLM API 장애 / 가격 인상
	중
	높음
	멀티 모델 폴백 설계 (Gemini ↔ Claude ↔ GPT-4o)
	크롤링 대상 사이트 구조 변경
	높음
	중
	Playwright 선택자 모니터링, 주 1회 자동 검증
	개인정보보호법 위반 리스크
	낮음
	매우 높음
	법률 자문 확보, 공개 데이터 한정 수집 정책
	LLM 환각(Hallucination) 오류
	중
	중
	Zod 강제 검증, 출력에 신뢰도 점수 표시
	MVP 일정 지연
	중
	중
	SignalCraft M3 완료 후 나머지 에이전트 순차 개발
	초기 고객 유치 부진
	중
	높음
	볼로냐 북페어 D-30 무료 파일럿 3개사 선 확보
	

13. 오픈 이슈 및 결정 필요 사항


#
	이슈
	담당자
	결정 기한
	OI-01
	네이버 댓글 수집 API 약관 재확인 — 상업적 이용 허용 여부
	법무 + PM
	M1 완료 전
	OI-02
	멀티테넌시 데이터 격리 방식 — 스키마 분리 vs Row-Level Security
	개발 리드
	M1 Sprint 1
	OI-03
	LLM 비용 예산 상한 알림 설정 — 테넌트별 월 한도 정책
	PM
	M2 Sprint 3
	OI-04
	볼로냐 북페어 파일럿 파트너 선정 — 3개사 목표
	사업 담당
	M5 전
	OI-05
	Analytics Agent 개발 시작 시점 — Phase 2 정확한 일정 확정
	PM + CTO
	M4 리뷰 시
	





— END OF DOCUMENT —
EduRights AI PRD v1.0  ·  CONFIDENTIAL
CONFIDENTIAL  ·  EduRights AI  ·   /