import { z } from "zod";
import type { ModuleConfig } from "./types.ts";

/**
 * SignalCraft Module #11 — Crisis.
 *
 * Tech Spec §4.2 ROLE: 위기 커뮤니케이션 전문가
 * Tech Spec §4.2 TASK: 확산/통제/역전 3시나리오, SCCT(Situational Crisis
 *                      Communication Theory) 이론 기반 대응 전략
 *
 * SCCT 대응 유형: denial / diminishment / rebuild / reinforcement
 * #05 Risk Map의 최상위 리스크를 전제로 3시나리오를 전개한다.
 */

const StepSchema = z.object({
  timing: z.string().max(60), // e.g. "T+0~6h", "Day 1", "Week 1"
  action: z.string().max(200),
  channel: z.string().max(100),
  expectedOutcome: z.string().max(200),
});

export const CrisisSchema = z.object({
  focalRisk: z.string().max(200),
  scenarios: z
    .array(
      z.object({
        type: z.enum(["spread", "contain", "reverse"]),
        triggerCondition: z.string().max(200),
        probability: z.enum(["high", "medium", "low"]),
        ssctStrategy: z.enum(["denial", "diminishment", "rebuild", "reinforcement"]),
        steps: z.array(StepSchema).min(3).max(7),
        keyMessage: z.string().max(200),
        successIndicator: z.string().max(200),
      }),
    )
    .length(3),
  stakeholderMap: z
    .array(
      z.object({
        audience: z.string().max(80),
        priority: z.enum(["high", "medium", "low"]),
        channel: z.string().max(80),
        message: z.string().max(160),
      }),
    )
    .min(2)
    .max(6),
  confidence: z.enum(["high", "medium", "low"]),
  disclaimer: z.string().max(500).optional(),
});

export type CrisisOutput = z.infer<typeof CrisisSchema>;

export const crisisModuleConfig: ModuleConfig<CrisisOutput> = {
  id: "#11",
  title: "Crisis Response Playbook",
  role: "당신은 SCCT 이론에 정통한 위기 커뮤니케이션 전문가입니다.",
  task: [
    "1. focalRisk: upstreamResults['#05'].risks의 최상위 리스크를 focal로 삼아라 (없으면 rawPosts에서 가장 심각한 부정 담론).",
    "2. 3개 시나리오 작성 (정확히 3개, type은 spread/contain/reverse 각각):",
    "   - spread: 리스크가 그대로 확산되는 최악의 경로",
    "   - contain: 초기 대응으로 확산을 억제하는 경로",
    "   - reverse: 부정을 긍정 기회로 전환하는 경로",
    "3. 각 시나리오에 triggerCondition + probability + ssctStrategy(denial/diminishment/rebuild/reinforcement) 지정.",
    "   - denial: 사실 부인 (허위 정보일 때만)",
    "   - diminishment: 영향 축소 (맥락 보강)",
    "   - rebuild: 사과 + 재건 (실책 시)",
    "   - reinforcement: 긍정 자산 재환기 (칭찬/추모)",
    "4. steps 3~7개, 각 step은 timing/action/channel/expectedOutcome.",
    "5. keyMessage: 해당 시나리오 전체를 관통하는 한 문장 메시지 (200자 이내).",
    "6. stakeholderMap: 주요 이해관계자 2~6명에 대한 priority/channel/message.",
    "7. 일반론 금지 — 반드시 focalRisk의 맥락에 특화된 조치.",
  ].join("\n"),
  maxPosts: 15,
  maxOutputTokens: 3500,
  model: "claude-sonnet-4-6",
  temperature: 0.25,
  schema: CrisisSchema,
  schemaName: "CrisisSchema",
  outputExample: `{
  "focalRisk": "세이펜 대비 3배 가격 부담 담론 확산",
  "scenarios": [
    {
      "type": "spread",
      "triggerCondition": "네이버 카페 메인 노출 + 인플루언서 가격 지적",
      "probability": "medium",
      "ssctStrategy": "diminishment",
      "steps": [
        { "timing": "T+0~6h", "action": "가격 구성 상세 설명 Q&A 배포", "channel": "공식 블로그", "expectedOutcome": "부정 댓글 비율 20% 감소" }
      ],
      "keyMessage": "15만원은 5년 장기 가치로 월 2,500원 수준",
      "successIndicator": "7일 내 긍정 비율 재상승"
    }
  ],
  "stakeholderMap": [
    { "audience": "기존 고객", "priority": "high", "channel": "카카오 채널", "message": "가격 인상 없음 재확인" }
  ],
  "confidence": "medium"
}`,
};
