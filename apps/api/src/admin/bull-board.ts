import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import type { Express, RequestHandler } from "express";
import basicAuth from "express-basic-auth";
import { env } from "../infra/env.ts";
import { listQueues } from "../infra/queues.ts";

/**
 * Mount bull-board admin UI at /admin/queues, protected by basic auth.
 * Credentials come from ADMIN_USER / ADMIN_PASS env vars.
 */
export function mountBullBoard(app: Express): void {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath("/admin/queues");

  createBullBoard({
    queues: listQueues().map((q) => new BullMQAdapter(q)),
    serverAdapter,
  });

  const auth: RequestHandler = basicAuth({
    users: { [env.ADMIN_USER]: env.ADMIN_PASS },
    challenge: true,
    realm: "eduright-admin",
  });

  app.use("/admin/queues", auth, serverAdapter.getRouter());
}
