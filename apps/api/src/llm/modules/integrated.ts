import { z } from "zod";
import type { ModuleConfig } from "./types.ts";

/**
 * SignalCraft Module #13 — Integrated Report.
 *
 * 상품 중심 복합 분석 통합 리포트.
 * 연관검색어를 데이터 소스로 활용하여 하나의 상품에 대한
 * 통합 심화 분석 문서를 생성한다.
 *
 * #13 always runs last. It receives every prior module's output via
 * ctx.upstreamResults and is responsible for producing the final
 * sections array that the report renderer consumes.
 */

const SECTION_ID = /^section-\d{1,3}$/;

export const IntegratedSchema = z.object({
  title: z.string().min(5).max(200),
  sections: z
    .array(
      z.object({
        id: z.string().regex(SECTION_ID),
        title: z.string().min(1).max(120),
        content: z.string().min(1).max(5000),
        sourceModule: z.string().max(20).optional(),
      }),
    )
    .min(1)
    .max(20),
  metadata: z.object({
    keyword: z.string().min(1).max(200),
    generatedAt: z.string(),
    modulesUsed: z.array(z.string().max(20)).max(14),
  }),
  confidence: z.enum(["high", "medium", "low"]),
  disclaimer: z.string().max(800).optional(),
});

export type IntegratedOutput = z.infer<typeof IntegratedSchema>;

export const integratedModuleConfig: ModuleConfig<IntegratedOutput> = {
  id: "#13",
  title: "Integrated Report",
  role: [
    "당신은 GoldenCheck SignalCraft의 통합 리포트 편집장입니다.",
    "고객이 등록한 제품 1개와 연관검색어 N개에 대해 선행 모듈 결과를 종합하여,",
    "판매사에게 실질적으로 도움이 되는 하나의 통합 분석 리포트를 작성합니다.",
    "",
    "핵심 원칙:",
    "1. 분석 단위는 '상품' — 키워드별로 따로 분석하지 말고, 여러 키워드 데이터를 교차·복합 분석하여 상품에 대한 통합 인사이트를 도출",
    "2. 정량 + 정성 복합 — 수치 나열 금지, 모든 수치에 '그래서 뭐가 문제이고 어떻게 해야 하는가' 해석 필수",
    "3. 판매사 관점 — 모든 문제에 매출 영향 추정치, 모든 기회에 예상 추가 매출, 모든 전략에 투자금액+ROI 제시",
    "4. 환각 방지 — 선행 모듈 결과에 없는 사실 생성 절대 금지",
  ].join("\n"),
  task: [
    "ctx.upstreamResults에 있는 모든 선행 모듈 결과를 종합하여 아래 11개 섹션을 반드시 작성하라.",
    "각 section의 content에는 JSON이 아닌 **한국어 서술형 텍스트**로 작성한다.",
    "키워드별 개별 분석 금지 — 키워드는 상품을 입체적으로 분석하기 위한 데이터 렌즈로만 활용.",
    "",
    "필수 섹션 (순서 및 sourceModule 정확히 지킬 것):",
    "",
    'section-1: "진단 요약 — [제품명]은 지금 어디에 있는가" sourceModule="#08"',
    "  리포트의 BLUF. 한 문장 진단 + 핵심 진단 3가지(데이터 근거+매출 영향) + 결론(우선순위와 이유).",
    "  경영진이 이 섹션만 읽어도 상황 파악과 의사결정이 가능해야 함.",
    "",
    'section-2: "시장 속의 [제품명] — 소비자 인식 지도" sourceModule="#01"',
    "  연관검색어를 소비자 인식 4단계로 재구성: 미인지 → 카테고리 비교 → 관심 → 구매직전 이탈.",
    "  각 층별 키워드, 합산 검색량, 제품 노출률, 감성, 핵심 문제. 퍼널 전환율 추정(업계 평균 대비).",
    "",
    'section-3: "인식 vs 현실 — [제품명]이 풀어야 할 오해들" sourceModule="#03"',
    "  감성 데이터에서 소비자 오해 2~4가지 도출.",
    "  각 오해: 소비자 인식(데이터) → 실제 현실(팩트) → 오해 발생 원인 → 매출 손실 추정 → 처방.",
    "",
    'section-4: "경쟁 지형과 [제품명]의 해자" sourceModule="#06"',
    "  SOV 통합 + 전장별 승패 + 경쟁사별 가격·약점·셀링포인트.",
    "  제품만의 '해자(moat)' 3가지(경쟁사가 단기 모방 불가한 자산) 도출.",
    "",
    'section-5: "구매 전환 병목 해부 — 알면서도 안 사는 이유" sourceModule="#06"',
    "  구매 퍼널에서 전환이 끊어지는 2~4개 지점 특정.",
    "  각 병목: 현상(데이터) → 원인 → 해법 + 콘텐츠 갭 목록 + 합산 손실 추정.",
    "",
    'section-6: "숨은 시장과 변곡점 — 기회의 창" sourceModule="#01"',
    "  잠재 시장 2~3개(검색량, 감성, 진입 전략, 매출 잠재력).",
    "  유리한 모멘텀(변곡점 이벤트 + 활용법) + 방치 시 위협 + '지금이 행동 시점인 이유'.",
    "",
    'section-7: "방치 vs 실행 — 6개월 후 시나리오" sourceModule="#07"',
    "  시나리오 A(방치): 1/3/6개월 후. 시나리오 B(실행): 1/3/6개월 후.",
    "  연 매출 격차 + 투자 금액 + ROI 정량화.",
    "",
    'section-8: "통합 전략 — 3단계 시장 공략 로드맵" sourceModule="#07"',
    "  1단계 방어(1~2주) → 2단계 전환(3~4주) → 3단계 확장(5~8주).",
    "  각 단계 구체적 액션 + 목표. '왜 이 순서인가' 설명 필수.",
    "",
    'section-9: "세그먼트별 메시지 전략" sourceModule="#07"',
    "  핵심 메시지 1문장 + 3~5개 세그먼트(사람 유형으로 정의) 각각의 메시지+CTA + 톤앤매너.",
    "",
    'section-10: "투자 계획과 기대 수익" sourceModule="#07"',
    "  채널별 우선순위·투자·ROI·근거·KPI. 총 투자·추가매출·손익분기점.",
    "",
    'section-11: "30일 액션 플랜" sourceModule="#08"',
    "  주차별(1~4주) 액션(HIGH/MEDIUM) + 30일 목표 KPI 5~6개(현재→목표 형식).",
    "",
    "해당 모듈이 실패한 경우 그 섹션의 content에 '데이터 수집 부족으로 분석 불가'라고 적어라.",
    "원문에 없는 사실을 만들지 마라. 선행 모듈 결과만 인용·재구성하라.",
    "각 섹션 content는 2,000~4,000자 범위로 작성. 구조: 소제목(◆,■,●,━━) + 본문 + 시사점.",
  ].join("\n"),
  maxPosts: 10,
  maxOutputTokens: 8000,
  model: "claude-sonnet-4-6",
  temperature: 0.2,
  schema: IntegratedSchema,
  schemaName: "IntegratedSchema",
  outputExample: `{
  "title": "[제품명] — 연관검색어 통합 분석 리포트",
  "sections": [
    { "id": "section-1", "title": "진단 요약 — [제품명]은 지금 어디에 있는가", "content": "[제품명]은 유아 오디오 교구 시장에서 가장 많이 언급되지만 동시에 가장 많이 불만이 제기되는 제품이다. 연관검색어 통합 분석 결과, '높은 인지도 + 낮은 전환율'이라는 구조적 문제가 확인된다.\\n\\n핵심 진단 3가지:\\n1. [인식-현실 갭] ...\\n2. [인지도-호감도 역전] ...\\n3. [시장 사각지대] ...\\n\\n결론: ...", "sourceModule": "#08" },
    { "id": "section-2", "title": "시장 속의 [제품명] — 소비자 인식 지도", "content": "연관검색어를 소비자 인식 단계별로 재구성하면...\\n\\n[1층: 미인지 시장]...\\n[2층: 비교 시장]...\\n[3층: 관심 시장]...\\n[4층: 이탈 시장]...", "sourceModule": "#01" },
    { "id": "section-3", "title": "인식 vs 현실 — [제품명]이 풀어야 할 오해들", "content": "종합 감성: 긍정 47% · 부정 31% · 중립 22%\\n\\n◆ 오해 1: ...\\n◆ 오해 2: ...\\n◆ 오해 3: ...", "sourceModule": "#03" },
    { "id": "section-4", "title": "경쟁 지형과 [제품명]의 해자", "content": "...", "sourceModule": "#06" },
    { "id": "section-5", "title": "구매 전환 병목 해부 — 알면서도 안 사는 이유", "content": "...", "sourceModule": "#06" },
    { "id": "section-6", "title": "숨은 시장과 변곡점 — 기회의 창", "content": "...", "sourceModule": "#01" },
    { "id": "section-7", "title": "방치 vs 실행 — 6개월 후 시나리오", "content": "...", "sourceModule": "#07" },
    { "id": "section-8", "title": "통합 전략 — 3단계 시장 공략 로드맵", "content": "...", "sourceModule": "#07" },
    { "id": "section-9", "title": "세그먼트별 메시지 전략", "content": "...", "sourceModule": "#07" },
    { "id": "section-10", "title": "투자 계획과 기대 수익", "content": "...", "sourceModule": "#07" },
    { "id": "section-11", "title": "30일 액션 플랜", "content": "...", "sourceModule": "#08" }
  ],
  "metadata": { "keyword": "[대표 키워드]", "generatedAt": "2026-04-15T00:00:00.000Z", "modulesUsed": ["#01","#03","#06","#07","#08","#13"] },
  "confidence": "high",
  "disclaimer": "본 분석은 네이버·맘카페·HackerNews 기반 샘플 분석이며, 수치는 수집 범위 내 추정치입니다."
}`,
};
