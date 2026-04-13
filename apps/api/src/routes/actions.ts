import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { z } from "zod";
import { getPool } from "../infra/db.ts";
import { callModel } from "../llm/client.ts";

/**
 * POST /api/v2/actions/generate
 *   Body: { jobId, tenantId, actionType }
 *   actionType: "campaign_draft" | "content_calendar"
 *
 * Reads the SignalCraft job's module outputs (#03, #07, #08) and
 * generates marketing-ready content via a single LLM call.
 * Persists the result in signalcraft_actions for retrieval.
 *
 * GET /api/v2/actions/:id
 *   Returns a previously generated action.
 */

const GenerateSchema = z.object({
  jobId: z.string().uuid(),
  tenantId: z.string().uuid(),
  actionType: z.enum(["campaign_draft", "content_calendar"]),
});

const ACTION_PROMPTS: Record<string, { role: string; task: string; maxTokens: number }> = {
  campaign_draft: {
    role: "당신은 교육 콘텐츠 마케팅 카피라이터입니다.",
    task: [
      "아래 분석 결과를 바탕으로 마케팅 캠페인 초안을 작성하라.",
      "",
      "출력 JSON 구조:",
      "{",
      '  "subject": "이메일/SNS 제목 (30자 이내)",',
      '  "body": "본문 (300~500자, 학부모 대상, 친근한 어투)",',
      '  "cta": "행동 유도 문구 (예: 무료 체험 시작하기)",',
      '  "channels": ["적합한 채널 목록"],',
      '  "hashtags": ["추천 해시태그 5개"],',
      '  "timing": "최적 발송 시점 추천"',
      "}",
      "",
      "반드시 위 JSON만 응답. 다른 텍스트 금지.",
    ].join("\n"),
    maxTokens: 1500,
  },
  content_calendar: {
    role: "당신은 교육 콘텐츠 SNS 마케팅 기획자입니다.",
    task: [
      "아래 분석 결과를 바탕으로 이번 주 콘텐츠 캘린더를 작성하라.",
      "",
      "출력 JSON 구조:",
      "{",
      '  "weekOf": "YYYY-MM-DD (이번 주 월요일)",',
      '  "items": [',
      "    {",
      '      "day": "월요일",',
      '      "channel": "naver_blog | instagram | youtube | email",',
      '      "topic": "콘텐츠 주제",',
      '      "format": "카드뉴스 | 블로그 포스트 | 숏폼 영상 | 이메일 뉴스레터",',
      '      "outline": "핵심 메시지 1~2문장",',
      '      "timing": "발행 시간 (예: 오전 10시)"',
      "    }",
      "  ]",
      "}",
      "",
      "월~금 5일, 하루 1개씩 총 5개 항목. 반드시 위 JSON만 응답.",
    ].join("\n"),
    maxTokens: 2000,
  },
};

async function getModuleOutputsForJob(jobId: string): Promise<Record<string, unknown>> {
  const pool = getPool();
  const res = await pool.query<{ module_id: string; output: unknown }>(
    `SELECT module_id, output FROM signalcraft_module_outputs
      WHERE job_id = $1 AND status = 'success'
      ORDER BY module_id`,
    [jobId],
  );
  const outputs: Record<string, unknown> = {};
  for (const r of res.rows) {
    outputs[r.module_id] = r.output;
  }
  return outputs;
}

export const actionsRouter: ExpressRouter = Router();

actionsRouter.post("/generate", async (req: Request, res: Response) => {
  const parsed = GenerateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "invalid_body",
      issues: parsed.error.flatten().fieldErrors,
    });
  }
  const { jobId, tenantId, actionType } = parsed.data;
  const promptConfig = ACTION_PROMPTS[actionType];
  if (!promptConfig) {
    return res.status(400).json({ error: "unknown_action_type" });
  }

  const pool = getPool();

  const actionInsert = await pool.query<{ id: string }>(
    `INSERT INTO signalcraft_actions (tenant_id, job_id, action_type, input, status)
     VALUES ($1, $2, $3, $4, 'generating')
     RETURNING id`,
    [tenantId, jobId, actionType, JSON.stringify({ actionType })],
  );
  const actionId = actionInsert.rows[0]?.id;
  if (!actionId) {
    return res.status(500).json({ error: "action_insert_failed" });
  }

  try {
    const moduleOutputs = await getModuleOutputsForJob(jobId);
    const contextSummary = JSON.stringify(moduleOutputs).slice(0, 3000);

    const started = Date.now();
    const llmRes = await callModel(
      {
        model: "claude-sonnet-4-6",
        messages: [
          {
            role: "system",
            content: `## ROLE\n${promptConfig.role}\n\n## TASK\n${promptConfig.task}`,
          },
          {
            role: "user",
            content: `분석 결과:\n${contextSummary}\n\n위 분석 결과를 바탕으로 ${actionType === "campaign_draft" ? "캠페인 초안" : "콘텐츠 캘린더"}를 생성하라.`,
          },
        ],
        maxOutputTokens: promptConfig.maxTokens,
        temperature: 0.4,
        expectedSchemaName: actionType,
      },
      { tenantId, jobId, moduleId: `action:${actionType}` },
    );

    const durationMs = Date.now() - started;

    let output: unknown = null;
    try {
      const cleaned = llmRes.content.trim();
      const first = cleaned.indexOf("{");
      const last = cleaned.lastIndexOf("}");
      if (first >= 0 && last > first) {
        output = JSON.parse(cleaned.slice(first, last + 1));
      } else {
        output = { raw: cleaned };
      }
    } catch {
      output = { raw: llmRes.content };
    }

    await pool.query(
      `UPDATE signalcraft_actions
         SET output = $2, status = 'done', model_name = $3, duration_ms = $4
       WHERE id = $1`,
      [actionId, JSON.stringify(output), "claude-sonnet-4-6", durationMs],
    );

    return res.status(201).json({ actionId, actionType, status: "done", output });
  } catch (err) {
    const error = err as Error;
    await pool
      .query(`UPDATE signalcraft_actions SET status = 'failed', error_msg = $2 WHERE id = $1`, [
        actionId,
        error.message.slice(0, 500),
      ])
      .catch(() => {});
    return res
      .status(500)
      .json({ error: "generation_failed", message: error.message.slice(0, 200) });
  }
});

actionsRouter.get("/:id", async (req: Request, res: Response) => {
  const id = req.params.id;
  if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
    return res.status(400).json({ error: "invalid_id" });
  }
  const pool = getPool();
  const result = await pool.query(
    `SELECT id, tenant_id, job_id, action_type, output, status, error_msg,
            model_name, duration_ms, created_at
       FROM signalcraft_actions WHERE id = $1`,
    [id],
  );
  if (result.rowCount === 0) {
    return res.status(404).json({ error: "not_found" });
  }
  return res.json(result.rows[0]);
});
