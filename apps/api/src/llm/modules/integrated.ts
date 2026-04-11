import { z } from "zod";
import type { ModuleConfig } from "./types.ts";

/**
 * SignalCraft Module #13 — Integrated Report.
 *
 * Tech Spec §4.2 ROLE: 리포트 편집장
 * Tech Spec §4.2 TASK: 12개 모듈 결과를 피라미드 원칙으로 재구성, 중복
 *                       통합, 출처 부록 자동 생성
 *
 * #13 always runs last. It receives every prior module's output via
 * ctx.upstreamResults and is responsible for producing the final
 * sections array that the report renderer (Phase 5 §3.2) consumes.
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
  role: "당신은 SignalCraft 리포트 편집장입니다. 피라미드 원칙(BLUF)으로 보고서를 구성합니다.",
  task: [
    "1. ctx.upstreamResults에 들어 있는 모든 선행 모듈 결과를 검토하라.",
    "2. 피라미드 원칙으로 재구성한 sections 배열을 작성하라. 각 section은",
    "   id(`section-1`, `section-2` 형식), title, content, sourceModule(선행 모듈 id)을 포함한다.",
    "3. 동일 사실이 여러 모듈에서 반복되면 한 섹션으로 통합하라. 중복 금지.",
    "4. 첫 번째 섹션은 반드시 한 줄 BLUF로 시작하라(가능하면 #08 oneLiner 사용).",
    "5. metadata에 keyword, generatedAt(ISO), modulesUsed(실제 사용한 모듈 id 배열)를 채워라.",
    "6. 분석 신뢰도(high/medium/low)와 필요 시 disclaimer를 첨부하라.",
    "원문에 없는 사실을 새로 만들지 말고, 선행 모듈 결과만 인용·재구성하라.",
  ].join("\n"),
  maxPosts: 10,
  maxOutputTokens: 3000,
  model: "claude-sonnet-4-6",
  temperature: 0.2,
  schema: IntegratedSchema,
  schemaName: "IntegratedSchema",
};
